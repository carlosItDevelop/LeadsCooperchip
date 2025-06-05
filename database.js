
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Database initialization
async function initializeDatabase() {
    const client = await pool.connect();
    
    try {
        // Create leads table
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                position VARCHAR(255),
                source VARCHAR(100),
                status VARCHAR(50) DEFAULT 'novo',
                value DECIMAL(10,2),
                notes TEXT,
                score INTEGER DEFAULT 0,
                assigned_to VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create tasks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date DATE,
                priority VARCHAR(20) DEFAULT 'medium',
                status VARCHAR(20) DEFAULT 'pending',
                lead_id INTEGER REFERENCES leads(id),
                assignee VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create activities table
        await client.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                type VARCHAR(50),
                title VARCHAR(255),
                description TEXT,
                datetime TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50),
                action VARCHAR(255),
                details TEXT,
                lead_id INTEGER REFERENCES leads(id),
                user_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        client.release();
    }
}

// API functions
const api = {
    // Leads
    async getLeads() {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM leads ORDER BY created_at DESC');
            return result.rows;
        } finally {
            client.release();
        }
    },

    async createLead(leadData) {
        const client = await pool.connect();
        try {
            const {
                name, company, email, phone, position, source, status, value, notes
            } = leadData;

            const result = await client.query(`
                INSERT INTO leads (name, company, email, phone, position, source, status, value, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [name, company, email, phone, position, source, status || 'novo', value, notes]);

            // Log the creation
            await this.createLog({
                type: 'lead',
                action: 'Novo lead criado',
                details: `Lead ${name} foi criado`,
                lead_id: result.rows[0].id
            });

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    async updateLead(id, leadData) {
        const client = await pool.connect();
        try {
            const {
                name, company, email, phone, position, source, status, value, notes
            } = leadData;

            const result = await client.query(`
                UPDATE leads SET 
                    name = $1, company = $2, email = $3, phone = $4, 
                    position = $5, source = $6, status = $7, value = $8, 
                    notes = $9, updated_at = CURRENT_TIMESTAMP
                WHERE id = $10
                RETURNING *
            `, [name, company, email, phone, position, source, status, value, notes, id]);

            // Log the update
            await this.createLog({
                type: 'lead',
                action: 'Lead atualizado',
                details: `Lead ${name} foi atualizado`,
                lead_id: id
            });

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    async deleteLead(id) {
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM leads WHERE id = $1', [id]);
            
            // Log the deletion
            await this.createLog({
                type: 'lead',
                action: 'Lead removido',
                details: `Lead ID ${id} foi removido`,
                lead_id: id
            });
        } finally {
            client.release();
        }
    },

    // Tasks
    async getTasks() {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT t.*, l.name as lead_name 
                FROM tasks t 
                LEFT JOIN leads l ON t.lead_id = l.id 
                ORDER BY t.due_date ASC
            `);
            return result.rows;
        } finally {
            client.release();
        }
    },

    async createTask(taskData) {
        const client = await pool.connect();
        try {
            const {
                title, description, due_date, priority, status, lead_id, assignee
            } = taskData;

            const result = await client.query(`
                INSERT INTO tasks (title, description, due_date, priority, status, lead_id, assignee)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [title, description, due_date, priority || 'medium', status || 'pending', lead_id, assignee]);

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    async updateTaskStatus(id, status) {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [status, id]);

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    // Activities
    async createActivity(activityData) {
        const client = await pool.connect();
        try {
            const { lead_id, type, title, description, datetime } = activityData;

            const result = await client.query(`
                INSERT INTO activities (lead_id, type, title, description, datetime)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [lead_id, type, title, description, datetime]);

            // Log the activity
            await this.createLog({
                type: 'activity',
                action: 'Atividade criada',
                details: `Atividade "${title}" foi agendada`,
                lead_id
            });

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    // Logs
    async getLogs(filters = {}) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT l.*, leads.name as lead_name 
                FROM logs l 
                LEFT JOIN leads ON l.lead_id = leads.id 
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 0;

            if (filters.start_date) {
                paramCount++;
                query += ` AND l.created_at >= $${paramCount}`;
                params.push(filters.start_date);
            }

            if (filters.end_date) {
                paramCount++;
                query += ` AND l.created_at <= $${paramCount}`;
                params.push(filters.end_date);
            }

            if (filters.type) {
                paramCount++;
                query += ` AND l.type = $${paramCount}`;
                params.push(filters.type);
            }

            query += ' ORDER BY l.created_at DESC LIMIT 100';

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    },

    async createLog(logData) {
        const client = await pool.connect();
        try {
            const { type, action, details, lead_id, user_id } = logData;

            const result = await client.query(`
                INSERT INTO logs (type, action, details, lead_id, user_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [type, action, details, lead_id, user_id || 'system']);

            return result.rows[0];
        } finally {
            client.release();
        }
    }
};

module.exports = {
    pool,
    initializeDatabase,
    api
};
