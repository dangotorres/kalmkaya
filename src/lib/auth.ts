import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import {
  obtenerColaboradores,
  semillarColaboradoresIniciales,
} from "./sheets";

// Initial users
const USUARIOS_INICIALES = [
  { nombre: "Karen", password: "Admin2026", rol: "admin" as const },
  { nombre: "Mike", password: "kalmkaya", rol: "supervisor" as const },
  { nombre: "Clau", password: "kalmkaya", rol: "colaborador" as const },
];

async function seedYObtenerUsuarios() {
  const iniciales = await Promise.all(
    USUARIOS_INICIALES.map(async (u) => ({
      nombre: u.nombre,
      passwordHash: await bcrypt.hash(u.password, 10),
      rol: u.rol,
    }))
  );
  await semillarColaboradoresIniciales(iniciales);
  return obtenerColaboradores();
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        name: { label: "Usuario" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const usuarios = await seedYObtenerUsuarios();
        const user = usuarios.find(
          (u) => u.nombre.toLowerCase() === String(credentials.name).toLowerCase()
        );
        if (!user) return null;
        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user.nombre,
          name: user.nombre,
          email: `${user.nombre.toLowerCase()}@kalmkaya.com`,
          role: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
