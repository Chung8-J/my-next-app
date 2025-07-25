import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    food_code,
    food_name,
    description,
    carbohydrate_per_100g,
    protein_per_100g,
    fat_per_100g,
    food_pic,
    food_genre,
    calories,
  } = req.body;

  if (!food_code) {
    return res.status(400).json({ error: 'Missing food_code' });
  }

  try {
    await pool.query(
      `UPDATE food SET
        food_name = $1,
        description = $2,
        carbohydrate_per_100g = $3,
        protein_per_100g = $4,
        fat_per_100g = $5,
        food_pic = $6,
        food_genre = $7,
        calories = $8
      WHERE food_code = $9`,
      [
        typeof food_name === 'string' ? food_name.trim() : food_name,
        typeof description === 'string' ? description.trim() : description,
        carbohydrate_per_100g,
        protein_per_100g,
        fat_per_100g,
        typeof food_pic === 'string' ? food_pic.trim() : food_pic,
        typeof food_genre === 'string' ? food_genre.trim() : food_genre,
        calories,
        food_code, // allow number or string
      ]
    );

    res.status(200).json({ message: '✅ Food updated successfully' });
  } catch (err) {
    console.error('❌ Edit food error:', err);
    res.status(500).json({ error: 'Database error' });
  }
}
