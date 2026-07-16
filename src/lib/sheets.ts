import { google } from "googleapis";

export type Registro = {
  fila: number;
  servicio: string;
  colaborador: string;
  tipoPago: string;
  precio: number | null;
  egreso: number | null;
  notas: string;
};

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está configurado en .env.local");
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export function fechaANombreHoja(fecha: Date): string {
  const tz = "America/Mexico_City";
  const formatter = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts = formatter.formatToParts(fecha);
  const d = parts.find((p) => p.type === "day")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const y = parts.find((p) => p.type === "year")!.value;
  return `${d}/${m}/${y}`;
}

function parsearNumero(val: string | undefined): number | null {
  if (!val) return null;
  // Sheets con locale México devuelve decimales con coma (ej: "150,45")
  // Normalizamos: si hay coma y no hay punto → la coma es decimal
  // Si hay ambos → formato 1.234,56 → quitamos puntos de miles y convertimos coma
  let normalized = val.trim();
  if (normalized.includes(",") && normalized.includes(".")) {
    // Formato 1.234,56 — punto=miles, coma=decimal
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    // Solo coma → separador decimal
    normalized = normalized.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

export async function obtenerRegistrosDia(nombreHoja: string): Promise<Registro[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${nombreHoja}'!A2:F1000`,
  });

  const rows = res.data.values ?? [];
  return rows
    .map((row, i) => ({
      fila: i + 2,
      servicio: row[0] ?? "",
      colaborador: row[1] ?? "",
      tipoPago: row[2] ?? "",
      precio: parsearNumero(row[3]),
      egreso: parsearNumero(row[4]),
      notas: row[5] ?? "",
    }))
    .filter((r) => r.servicio || r.egreso);
}

export async function insertarRegistro(
  nombreHoja: string,
  datos: {
    servicio: string;
    colaborador: string;
    tipoPago: string;
    precio?: number | null;
    salidasEgresos?: number | null;
    notas: string;
  }
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  let fila: (string | number)[];

  if (datos.salidasEgresos) {
    fila = [datos.servicio, "", datos.tipoPago, "", datos.salidasEgresos, datos.notas];
  } else {
    fila = [
      datos.servicio,
      datos.colaborador,
      datos.tipoPago,
      datos.precio ?? "",
      "",
      datos.notas,
    ];
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${nombreHoja}'!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [fila] },
  });
}

export async function crearHojaDelDia(nombreHoja: string): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const hojas = spreadsheet.data.sheets ?? [];

  const existe = hojas.some((h) => h.properties?.title === nombreHoja);
  if (existe) return;

  // Copia la última hoja de fecha (excluye hojas especiales como COLABORADORES)
  const hojasOrdenadas = hojas.filter(
    (h) => h.properties?.title && /^\d{2}\/\d{2}\/\d{4}$/.test(h.properties.title)
  );
  const ultimaHoja = hojasOrdenadas.length > 0 ? hojasOrdenadas[hojasOrdenadas.length - 1] : hojas[0];
  const sourceSheetId = ultimaHoja.properties?.sheetId!;

  const copyRes = await sheets.spreadsheets.sheets.copyTo({
    spreadsheetId,
    sheetId: sourceSheetId,
    requestBody: { destinationSpreadsheetId: spreadsheetId },
  });

  const nuevaSheetId = copyRes.data.sheetId!;

  // Renombra la hoja nueva
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: nuevaSheetId, title: nombreHoja },
            fields: "title",
          },
        },
      ],
    },
  });

  // Limpia datos desde fila 2 (preserva encabezados y fórmulas)
  const lastRow = ultimaHoja.properties?.gridProperties?.rowCount ?? 100;
  if (lastRow > 1) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${nombreHoja}'!A2:G${lastRow}`,
    });
  }
}

export async function listarHojas(): Promise<string[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return (res.data.sheets ?? [])
    .map((h) => h.properties?.title ?? "")
    .filter((name) => /^\d{2}\/\d{2}\/\d{4}$/.test(name));
}

// ─── Colaboradores ────────────────────────────────────────────────────────────

const HOJA_COLABORADORES = "COLABORADORES";

export type Colaborador = {
  nombre: string;
  passwordHash: string;
  rol: "admin" | "supervisor" | "colaborador";
};

export async function obtenerColaboradores(): Promise<Colaborador[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${HOJA_COLABORADORES}'!A2:C100`,
    });
    return (res.data.values ?? [])
      .filter((row) => row[0])
      .map((row) => ({
        nombre: row[0] ?? "",
        passwordHash: row[1] ?? "",
        rol: (row[2] ?? "colaborador") as Colaborador["rol"],
      }));
  } catch {
    return [];
  }
}

export async function agregarColaborador(colab: Colaborador): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [[colab.nombre, colab.passwordHash, colab.rol]] },
  });
}

export async function eliminarColaborador(nombre: string): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A2:C100`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === nombre);
  if (idx === -1) return;

  // Borra la fila desplazando las siguientes hacia arriba
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const hoja = spreadsheet.data.sheets?.find(
    (h) => h.properties?.title === HOJA_COLABORADORES
  );
  if (!hoja) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: hoja.properties!.sheetId!,
              dimension: "ROWS",
              startIndex: idx + 1, // +1 por el encabezado
              endIndex: idx + 2,
            },
          },
        },
      ],
    },
  });
}

export async function actualizarRolColaborador(
  nombre: string,
  nuevoRol: string
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A2:C100`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === nombre);
  if (idx === -1) throw new Error(`Colaborador "${nombre}" no encontrado`);

  const filaReal = idx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!C${filaReal}`,
    valueInputOption: "RAW",
    requestBody: { values: [[nuevoRol]] },
  });
}

export async function renombrarColaborador(
  nombre: string,
  nuevoNombre: string
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A2:C100`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === nombre);
  if (idx === -1) throw new Error(`Colaborador "${nombre}" no encontrado`);

  const filaReal = idx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A${filaReal}`,
    valueInputOption: "RAW",
    requestBody: { values: [[nuevoNombre]] },
  });
}

export async function actualizarPasswordColaborador(
  nombre: string,
  newHash: string
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!A2:C100`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === nombre);
  if (idx === -1) throw new Error(`Colaborador "${nombre}" no encontrado`);

  const filaReal = idx + 2; // +1 encabezado +1 base-1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${HOJA_COLABORADORES}'!B${filaReal}`,
    valueInputOption: "RAW",
    requestBody: { values: [[newHash]] },
  });
}

export async function semillarColaboradoresIniciales(
  iniciales: Colaborador[]
): Promise<void> {
  const existentes = await obtenerColaboradores();
  if (existentes.length > 0) return; // Ya hay datos
  for (const c of iniciales) {
    await agregarColaborador(c);
  }
}
