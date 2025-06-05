
const { Pool } = require('pg');

// Configuração do pool de conexões
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/GeneralLabSolutionsDb',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'GeneralLabSolutionsDb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Função para inicializar o banco de dados
async function initializeDatabase() {
    try {
        console.log('Conectando ao banco de dados...');
        
        // Testar conexão
        await pool.query('SELECT NOW()');
        console.log('Conexão com banco de dados estabelecida com sucesso!');

        // Criar tabelas se não existirem
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                position VARCHAR(255),
                source VARCHAR(100),
                status VARCHAR(50) DEFAULT 'novo',
                responsible VARCHAR(255),
                score INTEGER DEFAULT 50,
                temperature VARCHAR(20) DEFAULT 'morno',
                value DECIMAL(10,2) DEFAULT 0,
                notes TEXT,
                last_contact DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id VARCHAR(255),
                lead_id INTEGER REFERENCES leads(id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS activities (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                scheduled_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                color VARCHAR(20) DEFAULT 'blue',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_id VARCHAR(255)
            )
        `);

        console.log('Banco de dados inicializado com sucesso!');

        // Inserir dados de exemplo se não existirem
        await insertSampleData();

    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        throw error;
    }
}

// Inserir dados de exemplo
async function insertSampleData() {
    try {
        // Verificar se já existem dados
        const leadCount = await pool.query('SELECT COUNT(*) FROM leads');
        if (parseInt(leadCount.rows[0].count) > 0) {
            console.log('Dados já existem no banco');
            return;
        }

        // Inserir leads de exemplo
        const sampleLeads = [
            {
                name: 'João Silva',
                company: 'Tech Corp',
                email: 'joao.silva@techcorp.com',
                phone: '(11) 99999-1234',
                position: 'CTO',
                status: 'novo',
                source: 'website',
                responsible: 'Maria Santos',
                score: 85,
                temperature: 'quente',
                value: 50000,
                notes: 'Interessado em soluções de automação'
            },
            {
                name: 'Ana Costa',
                company: 'Inovação Ltda',
                email: 'ana.costa@inovacao.com',
                phone: '(11) 88888-5678',
                position: 'Gerente de TI',
                status: 'contato',
                source: 'referral',
                responsible: 'Carlos Oliveira',
                score: 72,
                temperature: 'morno',
                value: 35000,
                notes: 'Precisa de aprovação da diretoria'
            },
            {
                name: 'Pedro Santos',
                company: 'Startup XYZ',
                email: 'pedro@startupxyz.com',
                phone: '(11) 77777-9012',
                position: 'CEO',
                status: 'qualificado',
                source: 'event',
                responsible: 'Maria Santos',
                score: 95,
                temperature: 'quente',
                value: 75000,
                notes: 'Reunião agendada para próxima semana'
            }
        ];

        for (const lead of sampleLeads) {
            await pool.query(`
                INSERT INTO leads (name, company, email, phone, position, status, source, responsible, score, temperature, value, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [lead.name, lead.company, lead.email, lead.phone, lead.position, lead.status, lead.source, lead.responsible, lead.score, lead.temperature, lead.value, lead.notes]);
        }

        // Inserir tarefas de exemplo
        const sampleTasks = [
            {
                title: 'Follow-up com João Silva',
                description: 'Verificar interesse em proposta comercial',
                due_date: '2024-01-20',
                priority: 'high',
                status: 'pending',
                lead_id: 1,
                assignee: 'Maria Santos'
            },
            {
                title: 'Preparar demonstração',
                description: 'Criar apresentação personalizada para Tech Corp',
                due_date: '2024-01-18',
                priority: 'medium',
                status: 'pending',
                lead_id: 1,
                assignee: 'Carlos Oliveira'
            }
        ];

        for (const task of sampleTasks) {
            await pool.query(`
                INSERT INTO tasks (title, description, due_date, priority, status, lead_id, assignee)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [task.title, task.description, task.due_date, task.priority, task.status, task.lead_id, task.assignee]);
        }

        console.log('Dados de exemplo inseridos com sucesso!');
    } catch (error) {
        console.error('Erro ao inserir dados de exemplo:', error);
    }
}

// API Functions
const api = {
    // Leads
    async getLeads() {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        return result.rows;
    },

    async createLead(leadData) {
        const {
            name, company, email, phone, position, source, status,
            responsible, score, temperature, value, notes
        } = leadData;

        // Assign default responsible if not provided
        const assignedResponsible = responsible || ['João', 'Maria', 'Carlos'][Math.floor(Math.random() * 3)];

        const result = await pool.query(`
            INSERT INTO leads (name, company, email, phone, position, source, status, responsible, score, temperature, value, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [name, company, email, phone, position, source, status, assignedResponsible, score, temperature, value, notes]);

        return result.rows[0];
    },

    async updateLead(id, leadData) {
        const {
            name, company, email, phone, position, source, status,
            responsible, score, temperature, value, notes
        } = leadData;

        // Validate required fields
        if (!name || !email) {
            throw new Error('Nome e email são campos obrigatórios');
        }

        // Assign default responsible if not provided
        const assignedResponsible = responsible || ['João', 'Maria', 'Carlos'][Math.floor(Math.random() * 3)];

        const result = await pool.query(`
            UPDATE leads 
            SET name = $1, company = $2, email = $3, phone = $4, position = $5, 
                source = $6, status = $7, responsible = $8, score = $9, 
                temperature = $10, value = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *
        `, [name, company, email, phone, position, source, status, assignedResponsible, score || 50, temperature || 'morno', value || 0, notes, id]);

        if (result.rows.length === 0) {
            throw new Error('Lead não encontrado');
        }

        return result.rows[0];
    },

    async deleteLead(id) {
        await pool.query('DELETE FROM leads WHERE id = $1', [id]);
    },

    // Tasks
    async getTasks() {
        const result = await pool.query('SELECT * FROM tasks ORDER BY due_date ASC');
        return result.rows;
    },

    async createTask(taskData) {
        const { title, description, due_date, priority, status, lead_id, assignee } = taskData;

        const result = await pool.query(`
            INSERT INTO tasks (title, description, due_date, priority, status, lead_id, assignee)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [title, description, due_date, priority, status, lead_id, assignee]);

        return result.rows[0];
    },

    async updateTaskStatus(id, status) {
        const result = await pool.query(`
            UPDATE tasks 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        return result.rows[0];
    },

    // Logs
    async getLogs(filters = {}) {
        let query = 'SELECT * FROM logs';
        const params = [];
        const conditions = [];

        if (filters.type) {
            conditions.push(`type = $${params.length + 1}`);
            params.push(filters.type);
        }

        if (filters.start_date) {
            conditions.push(`DATE(timestamp) >= $${params.length + 1}`);
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            conditions.push(`DATE(timestamp) <= $${params.length + 1}`);
            params.push(filters.end_date);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY timestamp DESC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    async createLog(logData) {
        const { type, title, description, user_id, lead_id } = logData;

        const result = await pool.query(`
            INSERT INTO logs (type, title, description, user_id, lead_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [type, title, description, user_id, lead_id]);

        return result.rows[0];
    },

    // Activities
    async createActivity(activityData) {
        const { lead_id, type, title, description, scheduled_date } = activityData;

        const result = await pool.query(`
            INSERT INTO activities (lead_id, type, title, description, scheduled_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [lead_id, type, title, description, scheduled_date]);

        return result.rows[0];
    },

    // Notes
    async getNotesByLeadId(leadId) {
        const result = await pool.query('SELECT * FROM notes WHERE lead_id = $1 ORDER BY created_at DESC', [leadId]);
        return result.rows;
    },

    async createNote(noteData) {
        const { lead_id, content, color, user_id } = noteData;

        const result = await pool.query(`
            INSERT INTO notes (lead_id, content, color, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [lead_id, content, color || 'blue', user_id]);

        return result.rows[0];
    },

    async getAllNotes() {
        const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
        return result.rows;
    },

    async deleteNote(id) {
        await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    }
};

module.exports = { initializeDatabase, api, pool };
