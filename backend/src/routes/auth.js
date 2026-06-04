const { Router } = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = "7d";
const CODE_EXPIRES_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function validateSignupInput({ email, username, password }) {
  if (!email || !username || !password) {
    return "Email, username, and password are required";
  }

  if (!email.includes("@")) {
    return "Invalid email address";
  }

  if (username.length < 3) {
    return "Username must be at least 3 characters";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(email, code) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    throw new Error("SMTP configuration is missing");
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Your Signal X verification code",
    html: `
      <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                
                <tr>
                  <td style="padding:28px 28px 20px 28px;background:#ffffff;">
                    <div style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;">
                      Signal X
                    </div>
                    <div style="margin-top:6px;font-size:14px;color:#64748b;">
                      Crypto Intelligence Platform
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px;">
                    <div style="height:1px;background:#e2e8f0;"></div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f172a;">
                      Verify your email
                    </h1>

                    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
                      Use the verification code below to finish creating your Signal X account.
                    </p>

                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:22px;text-align:center;margin:24px 0;">
                      <div style="font-size:13px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                        Verification code
                      </div>

                      <div style="font-size:36px;line-height:1;font-weight:800;color:#0f172a;letter-spacing:8px;">
                        ${code}
                      </div>
                    </div>

                    <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#475569;">
                      This code expires in <strong>${CODE_EXPIRES_MINUTES} minutes</strong>.
                    </p>

                    <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                      If you did not request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                      Signal X — Simple market insights for traders.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

router.post("/request-signup-code", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const validationError = validateSignupInput({ email, username, password });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

    await prisma.emailVerificationCode.upsert({
      where: { email },
      update: {
        codeHash,
        attempts: 0,
        expiresAt,
      },
      create: {
        email,
        codeHash,
        attempts: 0,
        expiresAt,
      },
    });

    await sendVerificationEmail(email, code);

    return res.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("[auth route] Request signup code error:", error);
    return res.status(500).json({ error: "Failed to send verification code" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { email, username, password, code } = req.body;

    const validationError = validateSignupInput({ email, username, password });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const verification = await prisma.emailVerificationCode.findUnique({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({ error: "Please request a verification code first" });
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerificationCode.delete({
        where: { email },
      });

      return res.status(400).json({ error: "Verification code expired" });
    }

    if (verification.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.emailVerificationCode.delete({
        where: { email },
      });

      return res.status(400).json({ error: "Too many invalid attempts. Please request a new code" });
    }

    const codeValid = await bcrypt.compare(code, verification.codeHash);

    if (!codeValid) {
      await prisma.emailVerificationCode.update({
        where: { email },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return res.status(400).json({ error: "Invalid verification code" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
        },
      });

      await tx.emailVerificationCode.delete({
        where: { email },
      });

      return createdUser;
    });

    const token = createToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[auth route] Signup error:", error);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[auth route] Login error:", error);
    return res.status(500).json({ error: "Failed to authenticate" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[auth route] Me error:", error);
    return res.status(500).json({ error: "Failed to load user" });
  }
});

module.exports = router;