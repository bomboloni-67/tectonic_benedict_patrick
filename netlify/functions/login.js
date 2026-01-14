import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { password } = await req.json();
    const hashedPassword = process.env.HASHED_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    // Utilize Argon2 to verify the password against the stored hash
    const isValid = await argon2.verify(hashedPassword, password);

    if (isValid) {
      const token = jwt.sign({ authenticated: true }, jwtSecret, { expiresIn: '24h' });
      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid Credentials" }), { status: 401 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server Error" }), { status: 500 });
  }
};