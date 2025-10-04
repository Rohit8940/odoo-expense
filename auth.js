import express from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";
import { hashPassword, comparePassword } from "../utils/hash.js";

const router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_ROLES = ["customer", "enduser"];
const DEFAULT_ROLE = "customer";

const ensureJwtConfigured = () => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
};

const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role.name,
});

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

const normalizeRole = (incomingRole) => {
  const normalized = (incomingRole || DEFAULT_ROLE)
    .toString()
    .trim()
    .toLowerCase();

  if (!ALLOWED_ROLES.includes(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

router.post("/signup", async (req, res) => {
  try {
    ensureJwtConfigured();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server configuration error" });
  }

  const { email, name, phone, password, role } = req.body || {};

  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ message: "Email, name, and password are required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return res.status(400).json({ message: "Invalid role selection" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const dbRole = await prisma.role.upsert({
      where: { name: normalizedRole },
      update: {},
      create: { name: normalizedRole },
    });

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: name.trim(),
        phone: phone?.trim() || null,
        password: hashedPassword,
        roleId: dbRole.id,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    const token = jwt.sign(buildTokenPayload(createdUser), JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({ user: createdUser, token });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({ message: "User already exists" });
    }

    console.error("Signup error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    ensureJwtConfigured();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server configuration error" });
  }

  const { email, password, role } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = role ? normalizeRole(role) : null;

  if (role && !normalizedRole) {
    return res.status(400).json({ message: "Invalid role selection" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        password: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await comparePassword(password, user.password);

    if (!passwordMatches) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (normalizedRole && user.role.name !== normalizedRole) {
      return res.status(403).json({ message: "Role mismatch" });
    }

    const safeUser = sanitizeUser(user);
    const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({ user: safeUser, token });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
