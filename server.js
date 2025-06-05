
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, api } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize database on startup
initializeDatabase().catch(console.error);

// API Routes
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await api.getLeads();
        res.json(leads);
    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/leads', async (req, res) => {
    try {
        const newLead = await api.createLead(req.body);
        res.status(201).json(newLead);
    } catch (error) {
        console.error('Erro ao criar lead:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/leads/:id', async (req, res) => {
    try {
        const updatedLead = await api.updateLead(req.params.id, req.body);
        res.json(updatedLead);
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/leads/:id', async (req, res) => {
    try {
        await api.deleteLead(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar lead:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await api.getTasks();
        res.json(tasks);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = await api.createTask(req.body);
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Erro ao criar tarefa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/tasks/:id/status', async (req, res) => {
    try {
        const updatedTask = await api.updateTaskStatus(req.params.id, req.body.status);
        res.json(updatedTask);
    } catch (error) {
        console.error('Erro ao atualizar status da tarefa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await api.getLogs(req.query);
        res.json(logs);
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/logs', async (req, res) => {
    try {
        const newLog = await api.createLog(req.body);
        res.status(201).json(newLog);
    } catch (error) {
        console.error('Erro ao criar log:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/activities', async (req, res) => {
    try {
        const newActivity = await api.createActivity(req.body);
        res.status(201).json(newActivity);
    } catch (error) {
        console.error('Erro ao criar atividade:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files - must be last
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
