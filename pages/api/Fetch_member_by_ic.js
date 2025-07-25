import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  const { member_ic } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM member WHERE member_ic = $1', [member_ic]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
      
        const member = rows[0];

        // Format d_birth to 'YYYY-MM-DD' if it exists
        if (member.d_birth) {
          member.d_birth = new Date(member.d_birth).toISOString().split('T')[0];
        }
        res.status(200).json(member);
      
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
      
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
