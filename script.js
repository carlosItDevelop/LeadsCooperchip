// Global Variables
let currentTheme = 'dark';
let calendar;
let charts = {};
let leads = [];
let tasks = [];
let logs = [];
let draggedCard = null;

// API Base URL
const API_BASE = '/api';

// Sample Data
const sampleLeads = [
    {
        id: 1,
        name: 'João Silva',
        company: 'Tech Corp',
        email: 'joao.silva@techcorp.com',
        phone: '(11) 99999-1234',
        position: 'CTO',
        status: 'novo',
        source: 'website',
        responsible: 'Maria Santos',
        lastContact: '2024-01-15',
        score: 85,
        temperature: 'quente',
        value: 50000,
        notes: 'Interessado em soluções de automação'
    },
    {
        id: 2,
        name: 'Ana Costa',
        company: 'Inovação Ltda',
        email: 'ana.costa@inovacao.com',
        phone: '(11) 88888-5678',
        position: 'Gerente de TI',
        status: 'contato',
        source: 'referral',
        responsible: 'Carlos Oliveira',
        lastContact: '2024-01-14',
        score: 72,
        temperature: 'morno',
        value: 35000,
        notes: 'Precisa de aprovação da diretoria'
    },
    {
        id: 3,
        name: 'Pedro Santos',
        company: 'Startup XYZ',
        email: 'pedro@startupxyz.com',
        phone: '(11) 77777-9012',
        position: 'CEO',
        status: 'qualificado',
        source: 'event',
        responsible: 'Maria Santos',
        lastContact: '2024-01-13',
        score: 95,
        temperature: 'quente',
        value: 75000,
        notes: 'Reunião agendada para próxima semana'
    }
];

const sampleTasks = [
    {
        id: 1,
        title: 'Follow-up com João Silva',
        description: 'Verificar interesse em proposta comercial',
        dueDate: '2024-01-20',
        priority: 'high',
        status: 'pending',
        leadId: 1,
        assignee: 'Maria Santos'
    },
    {
        id: 2,
        title: 'Preparar demonstração',
        description: 'Criar apresentação personalizada para Tech Corp',
        dueDate: '2024-01-18',
        priority: 'medium',
        status: 'pending',
        leadId: 1,
        assignee: 'Carlos Oliveira'
    },
    {
        id: 3,
        title: 'Enviar proposta comercial',
        description: 'Finalizar e enviar proposta para Startup XYZ',
        dueDate: '2024-01-16',
        priority: 'high',
        status: 'completed',
        leadId: 3,
        assignee: 'Maria Santos'
    }
];

const sampleLogs = [
    {
        id: 1,
        type: 'lead',
        title: 'Novo lead criado',
        description: 'João Silva foi adicionado como novo lead',
        timestamp: '2024-01-15T10:30:00Z',
        userId: 'Maria Santos',
        leadId: 1
    },
    {
        id: 2,
        type: 'email',
        title: 'Email enviado',
        description: 'Template de boas-vindas enviado para Ana Costa',
        timestamp: '2024-01-14T14:20:00Z',
        userId: 'Carlos Oliveira',
        leadId: 2
    },
    {
        id: 3,
        type: 'call',
        title: 'Ligação realizada',
        description: 'Conversa de 15 minutos com Pedro Santos',
        timestamp: '2024-01-13T16:45:00Z',
        userId: 'Maria Santos',
        leadId: 3
    }
];

// Event Color Functions
function getEventColor(type) {
    const colors = {
        meeting: '#3b82f6',
        call: '#10b981',
        demo: '#f59e0b',
        email: '#8b5cf6',
        follow_up: '#ef4444',
        presentation: '#06b6d4'
    };
    return colors[type] || '#3b82f6';
}

function getEventBorderColor(type) {
    const colors = {
        meeting: '#2563eb',
        call: '#059669',
        demo: '#d97706',
        email: '#7c3aed',
        follow_up: '#dc2626',
        presentation: '#0891b2'
    };
    return colors[type] || '#2563eb';
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    initializeCharts();
    initializeCalendar();
    
    // Set up pipeline drag drop after DOM is loaded
    setTimeout(setupPipelineDragDrop, 1000);
});

function initializeApp() {
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Show dashboard by default
    showTab('dashboard');

    // Initialize service worker for notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = e.currentTarget.getAttribute('data-tab');
            showTab(tab);
            updateActiveNav(e.currentTarget);
        });
    });

    // Task filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterTasks(e.target.getAttribute('data-filter'));
        });
    });

    // Search functionality for leads
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterLeads, 300));
    }

    // Filter functionality for leads
    const filterSelects = document.querySelectorAll('.filters .filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', filterLeads);
    });

    // Logs filters
    const logsFilterBtn = document.querySelector('.logs-filters .btn');
    if (logsFilterBtn) {
        logsFilterBtn.addEventListener('click', applyLogsFilters);
    }

    // Auto-apply filters when date inputs change
    const dateInputs = document.querySelectorAll('.logs-filters .date-input');
    dateInputs.forEach(input => {
        input.addEventListener('change', applyLogsFilters);
    });

    // Auto-apply filters when type select changes
    const typeSelect = document.querySelector('.logs-filters .filter-select');
    if (typeSelect) {
        typeSelect.addEventListener('change', applyLogsFilters);
    }

    // Kanban drag and drop
    setupKanbanDragDrop();
    
    // Pipeline events drag and drop
    setupPipelineDragDrop();
}

async function loadSampleData() {
    try {
        // Carregar dados do banco
        leads = await fetchFromAPI('/leads');
        tasks = await fetchFromAPI('/tasks');
        logs = await fetchFromAPI('/logs');

        await loadAllLeadNotes();
        renderLeadsTable();
        renderKanbanBoard();
        renderTasksList();
        renderLogsTimeline();
<<<<<<< HEAD
        renderRecentHistory();
=======
        updatePipelineCounters();
        updateRecentEvents();
>>>>>>> c05725699305ce853548609181118729df793dec
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar dados do servidor', 'error');

        // Fallback para dados de exemplo se o servidor não estiver disponível
        leads = sampleLeads;
        tasks = sampleTasks;
        logs = sampleLogs;

        await loadAllLeadNotes();
        renderLeadsTable();
        renderKanbanBoard();
        renderTasksList();
        renderLogsTimeline();
<<<<<<< HEAD
        renderRecentHistory();
=======
        updatePipelineCounters();
        updateRecentEvents();
>>>>>>> c05725699305ce853548609181118729df793dec
    }
}

// Função para fazer requisições à API
async function fetchFromAPI(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('Erro na API:', error.message || error);
        showNotification('Erro na comunicação com o servidor', 'error');
        throw error;
    }
}

// Theme Management
function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Refresh content based on tab
    switch(tabName) {
        case 'calendar':
            if (calendar) calendar.render();
            break;
        case 'reports':
            updateCharts();
            break;
    }
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.nav-tab').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

// Leads Management
function renderLeadsTable() {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    tbody.innerHTML = leads.map(lead => `
        <tr style="cursor: pointer;" onclick="openLeadDetails(${lead.id})">
            <td>${lead.name}</td>
            <td>${lead.company}</td>
            <td>${lead.email}</td>
            <td>${lead.phone}</td>
            <td><span class="status-badge status-${lead.status}">${getStatusLabel(lead.status)}</span></td>
            <td>${lead.responsible}</td>
            <td>${formatDate(lead.last_contact || lead.lastContact)}</td>
            <td>${lead.score}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editLead(${lead.id}); event.stopPropagation();" title="Editar lead">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteLead(${lead.id}); event.stopPropagation();" title="Excluir lead">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderKanbanBoard() {
    const statuses = ['novo', 'contato', 'qualificado', 'proposta', 'negociacao', 'ganho'];

    statuses.forEach(status => {
        const container = document.getElementById(`${status}-cards`);
        if (!container) return;

        const statusLeads = leads.filter(lead => lead.status === status);

        container.innerHTML = statusLeads.map(lead => `
            <div class="kanban-card" draggable="true" data-lead-id="${lead.id}">
                <div class="card-header">
                    <h4>${lead.name}</h4>
                    <button class="btn-icon" onclick="openLeadDetails(${lead.id})" title="Ver/Editar lead">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <p><i class="fas fa-building"></i> ${lead.company}</p>
                <p><i class="fas fa-dollar-sign"></i> R$ ${formatCurrency(lead.value)}</p>
                <p><i class="fas fa-thermometer-${lead.temperature === 'quente' ? 'full' : lead.temperature === 'morno' ? 'half' : 'empty'}"></i> ${lead.temperature}</p>
                <p><i class="fas fa-user"></i> ${lead.responsible}</p>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="scheduleActivity(${lead.id})" title="Agendar atividade">
                        <i class="fas fa-calendar-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="addNote(${lead.id})" title="Adicionar nota">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update column count
        const columnHeader = container.closest('.kanban-column').querySelector('.lead-count');
        if (columnHeader) {
            columnHeader.textContent = statusLeads.length;
        }
    });
}

function setupKanbanDragDrop() {
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('kanban-card')) {
            draggedCard = e.target;
            e.target.style.opacity = '0.5';
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('kanban-card')) {
            e.target.style.opacity = '1';
            draggedCard = null;
        }
    });

    document.querySelectorAll('.column-cards').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });

        column.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');

            if (draggedCard) {
                const leadId = parseInt(draggedCard.getAttribute('data-lead-id'));
                const newStatus = e.currentTarget.id.replace('-cards', '');
                updateLeadStatus(leadId, newStatus);
            }
        });
    });
}

async function updateLeadStatus(leadId, newStatus) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showNotification('Lead não encontrado', 'error');
        return;
    }

    const oldStatus = lead.status;

    try {
        // Update lead status in database
        const updatedLead = await fetchFromAPI(`/leads/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...lead,
                status: newStatus
            })
        });

        // Update local array
        lead.status = newStatus;

        // Log the status change
        addLog({
            type: 'lead',
            title: 'Status atualizado',
            description: `Lead ${lead.name} movido de ${getStatusLabel(oldStatus)} para ${getStatusLabel(newStatus)}`,
            user_id: 'Usuário Atual',
            lead_id: leadId
        });

        renderKanbanBoard();
        renderLeadsTable();
        updatePipelineCounters();
        updateRecentEvents();
        showNotification('Status do lead atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        showNotification('Erro ao atualizar status do lead', 'error');

        // Revert the visual change if API call failed
        lead.status = oldStatus;
        renderKanbanBoard();
        renderLeadsTable();
        updatePipelineCounters();
        updateRecentEvents();
    }
}

// Tasks Management
function renderTasksList() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item" data-status="${task.status}">
            <input type="checkbox" class="task-checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                   onchange="toggleTaskStatus(${task.id})">
            <div class="task-content">
                <div class="task-title" style="cursor: pointer; color: var(--primary-color);" onclick="openTaskDetails(${task.id})">${task.title}</div>
                <div class="task-description">${task.description}</div>
            </div>
            <div class="task-date">
                <i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}
            </div>
        </div>
    `).join('');
}

function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const lead = leads.find(l => l.id === task.leadId);
    const statusBadge = task.status === 'completed' ? 'success' : 'warning';
    const priorityColor = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981';

    Swal.fire({
        title: 'Detalhes da Tarefa',
        html: `
            <div style="text-align: left; padding: 20px;">
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: var(--text-primary);">${task.title}</h3>
                    <span class="status-badge status-${task.status}" style="font-size: 11px; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; background-color: ${statusBadge === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${statusBadge === 'success' ? '#10b981' : '#f59e0b'};">
                        ${task.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </span>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong>Descrição:</strong><br>
                    <p style="margin: 5px 0; color: var(--text-secondary);">${task.description}</p>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong>Data de Vencimento:</strong><br>
                    <span style="color: var(--text-secondary);">${formatDate(task.dueDate)}</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong>Prioridade:</strong><br>
                    <span style="color: ${priorityColor}; font-weight: 600;">
                        ${task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                </div>

                <div style="margin-bottom: 15px;">
                    <strong>Responsável:</strong><br>
                    <span style="color: var(--text-secondary);">${task.assignee}</span>
                </div>

                ${lead ? `
                <div style="margin-bottom: 15px;">
                    <strong>Lead Relacionado:</strong><br>
                    <span style="color: var(--primary-color); cursor: pointer;" onclick="openLeadDetails(${lead.id})">${lead.name} - ${lead.company}</span>
                </div>
                ` : ''}
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: task.status === 'completed' ? 'Marcar como Pendente' : 'Marcar como Concluída',
        cancelButtonText: 'Fechar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
        color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b'
    }).then((result) => {
        if (result.isConfirmed) {
            toggleTaskStatus(taskId);
        }
    });
}

function filterTasks(filter) {
    const taskItems = document.querySelectorAll('.task-item');

    taskItems.forEach(item => {
        const status = item.getAttribute('data-status');
        let show = false;

        switch(filter) {
            case 'all':
                show = true;
                break;
            case 'pending':
                show = status === 'pending';
                break;
            case 'completed':
                show = status === 'completed';
                break;
            case 'overdue':
                // Implementation for overdue logic
                show = status === 'pending'; // Simplified
                break;
        }

        item.style.display = show ? 'flex' : 'none';
    });
}

async function toggleTaskStatus(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        try {
            await fetchFromAPI(`/tasks/${taskId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            addLog({
                type: 'task',
                title: 'Tarefa atualizada',
                description: `Tarefa "${task.title}" marcada como ${newStatus === 'completed' ? 'concluída' : 'pendente'}`,
                user_id: 'Usuário Atual',
                lead_id: task.lead_id
            });

            // Recarregar dados
            await loadSampleData();
            showNotification('Status da tarefa atualizado!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            showNotification('Erro ao atualizar tarefa', 'error');
        }
    }
}

// Calendar Management
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar-widget');
    if (!calendarEl) return;

    // Configurar drag and drop para eventos pré-definidos
    setupCalendarDragDrop();

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista'
        },
        dayMaxEvents: 3,
        eventDisplay: 'block',
        displayEventTime: true,
        allDaySlot: false,
        slotMinTime: '07:00:00',
        slotMaxTime: '19:00:00',
        height: 'auto',
        aspectRatio: 1.8,
        eventColor: '#3b82f6',
        eventBorderColor: '#3b82f6',
        eventTextColor: '#ffffff',
        events: async function(info, successCallback, failureCallback) {
            try {
                const activities = await fetchFromAPI('/activities');
                const events = activities.map(activity => ({
                    id: activity.id,
                    title: activity.title,
                    start: activity.datetime,
                    backgroundColor: getEventColor(activity.type),
                    borderColor: getEventBorderColor(activity.type),
                    extendedProps: {
                        leadId: activity.lead_id,
                        leadName: activity.lead_name,
                        leadCompany: activity.lead_company,
                        type: activity.type,
                        description: activity.description
                    }
                }));
                successCallback(events);
            } catch (error) {
                console.error('Erro ao carregar eventos:', error);
                failureCallback(error);
            }
        },
        eventClick: function(info) {
            const event = info.event;
            openActivityEditModal(event);
        },
        dateClick: function(info) {
            // Set default date/time for new event
            const clickedDate = new Date(info.date);
            
            // If it's today or future date, set to next available hour
            const now = new Date();
            if (clickedDate.toDateString() === now.toDateString()) {
                // Same day - set to next hour
                clickedDate.setHours(now.getHours() + 1, 0, 0, 0);
            } else {
                // Future day - set to 9 AM
                clickedDate.setHours(9, 0, 0, 0);
            }

            // Reset form and set datetime
            const form = document.getElementById('activityForm');
            form.reset();
            document.getElementById('activityDateTime').value = clickedDate.toISOString().slice(0, 16);
            
            // Populate leads dropdown
            const leadSelect = document.getElementById('activityLeadId');
            leadSelect.innerHTML = '<option value="">Selecione um lead (opcional)</option>';
            leads.forEach(lead => {
                const option = document.createElement('option');
                option.value = lead.id;
                option.textContent = `${lead.name} - ${lead.company}`;
                leadSelect.appendChild(option);
            });
            
            document.getElementById('activityModal').style.display = 'block';
        },
        drop: function(info) {
            // Função chamada quando um evento é dropado no calendário
            const eventType = info.draggedEl.getAttribute('data-event-type');
            if (eventType) {
                createEventFromTemplate(eventType, info.date);
            }
        },
        eventReceive: function(info) {
            // Função chamada quando um evento externo é adicionado
            console.log('Evento recebido:', info.event);
        },
        eventDidMount: function(info) {
            // Add tooltip
            info.el.setAttribute('title', info.event.title + '\n' + (info.event.extendedProps.description || ''));
        }
    });
}

function setupCalendarDragDrop() {
    const eventTemplates = document.querySelectorAll('.event-template');

    eventTemplates.forEach(template => {
        template.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.getAttribute('data-event-type'));
            this.style.opacity = '0.5';
        });

        template.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
        });
    });

    // Configurar o calendário para aceitar drops
    const calendarEl = document.getElementById('calendar-widget');
    if (calendarEl) {
        // Permitir que o calendário aceite drops
        calendarEl.addEventListener('dragover', function(e) {
            e.preventDefault();
        });

        calendarEl.addEventListener('drop', function(e) {
            e.preventDefault();
            const eventType = e.dataTransfer.getData('text/plain');

            // Tentar determinar a data baseada na posição do drop
            const rect = calendarEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Para uma implementação mais simples, usar a data atual
            const dropDate = new Date();
            dropDate.setHours(9, 0, 0, 0);

            if (eventType) {
                createEventFromTemplate(eventType, dropDate);
            }
        });
    }
}

function createEventFromTemplate(eventType, date) {
    const eventTemplates = {
        'novo': {
            title: 'Novo Lead - Contato Inicial',
            type: 'call',
            color: '#6366f1',
            description: 'Primeiro contato com novo lead'
        },
        'contato': {
            title: 'Primeiro Contato',
            type: 'call',
            color: '#f59e0b',
            description: 'Ligação ou email para primeiro contato'
        },
        'qualificado': {
            title: 'Reunião de Qualificação',
            type: 'meeting',
            color: '#10b981',
            description: 'Reunião para qualificar o lead'
        },
        'proposta': {
            title: 'Apresentar Proposta',
            type: 'meeting',
            color: '#8b5cf6',
            description: 'Apresentação ou envio da proposta comercial'
        },
        'negociacao': {
            title: 'Reunião de Negociação',
            type: 'meeting',
            color: '#ef4444',
            description: 'Discussão de termos e condições'
        }
    };

    const template = eventTemplates[eventType];
    if (!template || !calendar) return;

    // Criar o evento no calendário
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(startDate.getHours() + 1); // 1 hora de duração

    const newEvent = {
        id: Date.now().toString(),
        title: template.title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        backgroundColor: template.color,
        borderColor: template.color,
        extendedProps: {
            type: template.type,
            description: template.description,
            createdFrom: 'template'
        }
    };

    calendar.addEvent(newEvent);

    // Log da atividade
    addLog({
        type: 'meeting',
        title: 'Atividade agendada via template',
        description: `${template.title} agendada para ${formatDateTime(startDate)}`,
        user_id: 'Usuário Atual',
        lead_id: null
    });

    showNotification(`${template.title} agendada com sucesso!`, 'success');
}

// Charts Management
function initializeCharts() {
    initializeFunnelChart();
    initializeSourceChart();
    initializeSalesChart();
    initializeConversionChart();
    initializeActivityChart();
    initializePipelineTimeChart();
}

function initializeFunnelChart() {
    const element = document.getElementById('funnelChart');
    if (!element) return;

    const options = {
        series: [{
            name: 'Quantidade de Leads',
            data: [150, 120, 80, 45, 25, 15]
        }],
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4
            }
        },
        dataLabels: {
            enabled: false
        },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'],
        xaxis: {
            categories: ['Novos', 'Contato', 'Qualificados', 'Proposta', 'Negociação', 'Ganhos'],
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        grid: {
            borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
        },
        theme: {
            mode: currentTheme
        },
        legend: {
            show: false
        }
    };

    charts.funnel = new ApexCharts(element, options);
    charts.funnel.render();
}

function initializeSourceChart() {
    const element = document.getElementById('sourceChart');
    if (!element) return;

    const options = {
        series: [35, 25, 20, 15, 5],
        chart: {
            type: 'donut',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        labels: ['Website', 'Indicação', 'Redes Sociais', 'Eventos', 'Cold Call'],
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
        dataLabels: {
            enabled: true,
            style: {
                colors: [currentTheme === 'dark' ? '#f1f5f9' : '#1e293b']
            }
        },
        legend: {
            position: 'bottom',
            labels: {
                colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%'
                }
            }
        },
        theme: {
            mode: currentTheme
        }
    };

    charts.source = new ApexCharts(element, options);
    charts.source.render();
}

function initializeSalesChart() {
    const element = document.getElementById('salesChart');
    if (!element) return;

    const options = {
        series: [{
            name: 'Vendas Realizadas',
            data: [12, 19, 15, 25, 22, 30]
        }],
        chart: {
            type: 'line',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        colors: ['#10b981'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        grid: {
            borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
        },
        theme: {
            mode: currentTheme
        }
    };

    charts.sales = new ApexCharts(element, options);
    charts.sales.render();
}

function initializeConversionChart() {
    const element = document.getElementById('conversionChart');
    if (!element) return;

    const options = {
        series: [{
            name: 'Taxa de Conversão (%)',
            data: [85, 78, 92, 68]
        }],
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        colors: ['#3b82f6'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['Maria Santos', 'Carlos Oliveira', 'Ana Silva', 'Pedro Costa'],
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        yaxis: {
            max: 100,
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                },
                formatter: function(value) {
                    return value + '%';
                }
            }
        },
        grid: {
            borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
        },
        theme: {
            mode: currentTheme
        },
        legend: {
            show: false
        }
    };

    charts.conversion = new ApexCharts(element, options);
    charts.conversion.render();
}

function initializeActivityChart() {
    const element = document.getElementById('activityChart');
    if (!element) return;

    const options = {
        series: [{
            name: 'Ligações',
            data: [45, 52, 38, 67, 59, 73]
        }, {
            name: 'Reuniões',
            data: [28, 35, 42, 31, 45, 38]
        }, {
            name: 'Emails',
            data: [85, 93, 78, 102, 89, 95]
        }],
        chart: {
            type: 'line',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                }
            }
        },
        grid: {
            borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
        },
        theme: {
            mode: currentTheme
        },
        legend: {
            labels: {
                colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
            }
        }
    };

    charts.activity = new ApexCharts(element, options);
    charts.activity.render();
}

function initializePipelineTimeChart() {
    const element = document.getElementById('pipelineTimeChart');
    if (!element) return;

    const options = {
        series: [{
            name: 'Tempo Médio (dias)',
            data: [3, 7, 5, 12, 8]
        }],
        chart: {
            type: 'bar',
            height: 350,
            background: 'transparent',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '60%',
                borderRadius: 4,
                distributed: true
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            categories: ['Novo → Contato', 'Contato → Qualificado', 'Qualificado → Proposta', 'Proposta → Negociação', 'Negociação → Ganho'],
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                },
                rotate: -45
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                },
                formatter: function(value) {
                    return value + ' dias';
                }
            }
        },
        grid: {
            borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
        },
        theme: {
            mode: currentTheme
        },
        legend: {
            show: false
        }
    };

    charts.pipelineTime = new ApexCharts(element, options);
    charts.pipelineTime.render();
}

function updateCharts() {
    Object.values(charts).forEach(chart => {
        if (chart && chart.updateOptions) {
            // Para ApexCharts, atualizamos as opções de tema
            chart.updateOptions({
                theme: {
                    mode: currentTheme
                },
                xaxis: {
                    labels: {
                        style: {
                            colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                        }
                    }
                },
                grid: {
                    borderColor: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                },
                legend: {
                    labels: {
                        colors: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                },
                dataLabels: {
                    style: {
                        colors: [currentTheme === 'dark' ? '#f1f5f9' : '#1e293b']
                    }
                }
            });
        }
    });
}

// Logs Management
let currentLogsPage = 1;
const logsPerPage = 5;
let logsFilters = {
    startDate: '',
    endDate: '',
    type: ''
};

function renderLogsTimeline() {
    const logsTimeline = document.getElementById('logsTimeline');
    if (!logsTimeline) return;

    // Apply filters
    let filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];

        // Filter by start date
        if (logsFilters.startDate && logDate < logsFilters.startDate) {
            return false;
        }

        // Filter by end date
        if (logsFilters.endDate && logDate > logsFilters.endDate) {
            return false;
        }

        // Filter by type
        if (logsFilters.type && log.type !== logsFilters.type) {
            return false;
        }

        return true;
    });

    const sortedLogs = filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const totalPages = Math.ceil(sortedLogs.length / logsPerPage);
    const startIndex = (currentLogsPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

    logsTimeline.innerHTML = `
        <div class="logs-content">
            ${paginatedLogs.map((log, index) => `
                <div class="log-item">
                    <div class="log-icon">
                        <i class="fas fa-${getLogIcon(log.type)}"></i>
                    </div>
                    <div class="log-content">
                        <div class="log-title clickable" onclick="openLogDetails(${startIndex + index})" title="Clique para ver detalhes">${log.title}</div>
                        <div class="log-description">${log.description}</div>
                        <div class="log-time">${formatDateTime(log.timestamp)} - ${log.user_id || log.userId}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="logs-pagination">
            <button class="btn btn-sm btn-secondary" ${currentLogsPage === 1 ? 'disabled' : ''} onclick="changeLogsPage(${currentLogsPage - 1})">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <span class="pagination-info">Página ${currentLogsPage} de ${totalPages}</span>
            <button class="btn btn-sm btn-secondary" ${currentLogsPage === totalPages ? 'disabled' : ''} onclick="changeLogsPage(${currentLogsPage + 1})">
                Próxima <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function changeLogsPage(page) {
    // Apply current filters to get filtered logs count
    let filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];

        if (logsFilters.startDate && logDate < logsFilters.startDate) return false;
        if (logsFilters.endDate && logDate > logsFilters.endDate) return false;
        if (logsFilters.type && log.type !== logsFilters.type) return false;

        return true;
    });

    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    if (page < 1 || page > totalPages) return;

    currentLogsPage = page;
    renderLogsTimeline();
}

function applyLogsFilters() {
    const startDateInput = document.querySelector('.logs-filters .date-input:nth-child(1)');
    const endDateInput = document.querySelector('.logs-filters .date-input:nth-child(2)');
    const typeSelect = document.querySelector('.logs-filters .filter-select');

    logsFilters.startDate = startDateInput ? startDateInput.value : '';
    logsFilters.endDate = endDateInput ? endDateInput.value : '';
    logsFilters.type = typeSelect ? typeSelect.value : '';

    // Reset to first page when applying filters
    currentLogsPage = 1;
    renderLogsTimeline();

    showNotification('Filtros aplicados com sucesso!', 'success');
}

async function addLog(logEntry) {
    try {
        // Ensure the log entry has the correct field names for the database
        const dbLogEntry = {
            type: logEntry.type,
            title: logEntry.title,
            description: logEntry.description,
            user_id: logEntry.user_id || logEntry.userId,
            lead_id: logEntry.lead_id || logEntry.leadId
        };

        await fetchFromAPI('/logs', {
            method: 'POST',
            body: JSON.stringify(dbLogEntry)
        });

        // Recarregar logs
        logs = await fetchFromAPI('/logs');
        renderLogsTimeline();
    } catch (error) {
        console.error('Erro ao adicionar log:', error);
        showNotification('Erro ao salvar log', 'error');
    }
}

// Modal Management
function openLeadModal() {
    // Reset form for new lead
    const form = document.getElementById('leadForm');
    form.reset();
    document.getElementById('leadId').value = '';
    document.getElementById('leadModalTitle').textContent = 'Novo Lead';

    document.getElementById('leadModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openLeadDetails(leadId) {
    // Implementation for lead details modal/page
    showNotification(`Abrindo detalhes do lead ID: ${leadId}`, 'info');
}

function openEventModal() {
<<<<<<< HEAD
    // Reset form for new event
    const form = document.getElementById('eventForm');
    form.reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModalTitle').textContent = 'Nova Atividade';

    // Set default start date to current time
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); // Round to next 15 minutes
    document.getElementById('eventStartDate').value = now.toISOString().slice(0, 16);

    // Set default end date to 1 hour later
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
    document.getElementById('eventEndDate').value = endTime.toISOString().slice(0, 16);

    // Populate leads dropdown
    const leadSelect = document.getElementById('eventLeadId');
    leadSelect.innerHTML = '<option value="">Selecione um lead</option>';
    leads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `${lead.name} - ${lead.company}`;
        leadSelect.appendChild(option);
    });

    document.getElementById('eventModal').style.display = 'block';
=======
    // Reset form for new activity
    const form = document.getElementById('activityForm');
    form.reset();
    
    // Remove activity ID if exists (for new activities)
    const activityIdField = document.getElementById('activityId');
    if (activityIdField) {
        activityIdField.value = '';
    }

    // Set default date/time to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('activityDateTime').value = now.toISOString().slice(0, 16);

    // Populate leads dropdown if not already done
    const leadSelect = document.getElementById('activityLeadId');
    if (leadSelect && leadSelect.options.length <= 1) {
        leadSelect.innerHTML = '<option value="">Selecione um lead (opcional)</option>';
        leads.forEach(lead => {
            const option = document.createElement('option');
            option.value = lead.id;
            option.textContent = `${lead.name} - ${lead.company}`;
            leadSelect.appendChild(option);
        });
    }

    // Reset modal title and hide delete button
    document.getElementById('activityModalTitle').textContent = 'Agendar Atividade';
    const deleteButton = document.getElementById('deleteActivityBtn');
    if (deleteButton) {
        deleteButton.style.display = 'none';
    }

    // Open activity modal
    document.getElementById('activityModal').style.display = 'block';
>>>>>>> c05725699305ce853548609181118729df793dec
}

function openTaskModal() {
    // Reset form for new task
    const form = document.getElementById('taskForm');
    form.reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskModalTitle').textContent = 'Nova Tarefa';

    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];

    // Populate leads dropdown
    const leadSelect = document.getElementById('taskLeadId');
    leadSelect.innerHTML = '<option value="">Selecione um lead</option>';
    leads.forEach(lead => {
        const option = document.createElement('option');
        option.value = lead.id;
        option.textContent = `${lead.name} - ${lead.company}`;
        leadSelect.appendChild(option);
    });

    // Set default assignee
    document.getElementById('taskAssignee').value = 'Maria';

    document.getElementById('taskModal').style.display = 'block';
}

async function submitLead() {
    const form = document.getElementById('leadForm');
    const formData = new FormData(form);
    const leadId = formData.get('id');

    const leadData = {
        name: formData.get('name'),
        company: formData.get('company'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        position: formData.get('position'),
        source: formData.get('source'),
        status: formData.get('status') || 'novo',
        responsible: 'Usuário Atual',
        score: 50,
        temperature: 'morno',
        value: parseFloat(formData.get('value')) || 0,
        notes: formData.get('notes'),
        lastContact: new Date().toISOString().split('T')[0]
    };

    try {
        if (leadId) {
            // Edit existing lead
            const updatedLead = await fetchFromAPI(`/leads/${leadId}`, {
                method: 'PUT',
                body: JSON.stringify({...leadData, id: parseInt(leadId)})
            });

            // Update local array
            const leadIndex = leads.findIndex(l => l.id === parseInt(leadId));
            if (leadIndex !== -1) {
                leads[leadIndex] = {...leads[leadIndex], ...leadData, id: parseInt(leadId)};
            }

            await addLog({
                type: 'lead',
                title: 'Lead atualizado',
                description: `Lead ${leadData.name} foi editado`,
                user_id: 'Usuário Atual',
                lead_id: parseInt(leadId)
            });

            showNotification('Lead atualizado com sucesso!', 'success');
        } else {
            // Create new lead
            const newLead = await fetchFromAPI('/leads', {
                method: 'POST',
                body: JSON.stringify(leadData)
            });

            // Add to local array
            leads.push(newLead);

            await addLog({
                type: 'lead',
                title: 'Novo lead criado',
                description: `Lead ${leadData.name} foi adicionado ao sistema`,
                user_id: 'Usuário Atual',
                lead_id: newLead.id
            });

            showNotification('Lead criado com sucesso!', 'success');
        }

        // Re-render components
        renderLeadsTable();
        renderKanbanBoard();
        updatePipelineCounters();
        updateRecentEvents();

        closeModal('leadModal');
        form.reset();
        document.getElementById('leadModalTitle').textContent = 'Novo Lead';

    } catch (error) {
        console.error('Erro ao salvar lead:', error);
        showNotification('Erro ao salvar lead', 'error');
    }
}

// Utility Functions
function getStatusLabel(status) {
    const labels = {
        novo: 'Novo',
        contato: 'Primeiro Contato',
        qualificado: 'Qualificado',
        proposta: 'Proposta',
        negociacao: 'Negociação',
        ganho: 'Ganho',
        perdido: 'Perdido'
    };
    return labels[status] || status;
}

function getLogIcon(type) {
    const icons = {
        lead: 'user-plus',
        email: 'envelope',
        call: 'phone',
        task: 'tasks',
        meeting: 'calendar',
        note: 'sticky-note'
    };
    return icons[type] || 'info-circle';
}

function formatDate(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'Não informado';
    }

    try {
        const date = new Date(dateString);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Data inválida';
        }

        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error, 'Data recebida:', dateString);
        return 'Data inválida';
    }
}

function formatDateTime(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
        return 'Não informado';
    }

    try {
        const date = new Date(dateString);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Data inválida';
        }

        return date.toLocaleString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data/hora:', error, 'Data recebida:', dateString);
        return 'Data inválida';
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Function to normalize text (remove accents and convert to lowercase)
function normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function filterLeads() {
    const searchInput = document.querySelector('.search-input');
    const statusFilter = document.querySelector('.filters .filter-select:nth-child(2)');
    const responsibleFilter = document.querySelector('.filters .filter-select:nth-child(3)');

    const searchTerm = searchInput ? normalizeText(searchInput.value) : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';
    const selectedResponsible = responsibleFilter ? normalizeText(responsibleFilter.value) : '';

    let filteredLeads = leads.filter(lead => {
        // Search filter
        const matchesSearch = !searchTerm || 
            normalizeText(lead.name).includes(searchTerm) ||
            normalizeText(lead.company).includes(searchTerm) ||
            normalizeText(lead.email).includes(searchTerm);

        // Status filter
        const matchesStatus = !selectedStatus || lead.status === selectedStatus;

        // Responsible filter
        const matchesResponsible = !selectedResponsible || 
            normalizeText(lead.responsible).includes(selectedResponsible);

        return matchesSearch && matchesStatus && matchesResponsible;
    });

    renderFilteredLeadsTable(filteredLeads);
}

function renderFilteredLeadsTable(filteredLeads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    tbody.innerHTML = filteredLeads.map(lead => `
        <tr style="cursor: pointer;" onclick="openLeadDetails(${lead.id})">
            <td>${lead.name}</td>
            <td>${lead.company}</td>
            <td>${lead.email}</td>
            <td>${lead.phone}</td>
            <td><span class="status-badge status-${lead.status}">${getStatusLabel(lead.status)}</span></td>
            <td>${lead.responsible}</td>
            <td>${formatDate(lead.last_contact || lead.lastContact)}</td>
            <td>${lead.score}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editLead(${lead.id}); event.stopPropagation();" title="Editar lead">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteLead(${lead.id}); event.stopPropagation();" title="Excluir lead">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Notification System
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 16px;">&times;</button>
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

// Service Worker for Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
    // Request notification permission
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    });
}

// Simulated real-time updates
setInterval(() => {
    // Simulate receiving new notifications
    const notifications = [
        'Novo lead recebido via website',
        'Follow-up agendado foi completado',
        'Lead quente precisa de atenção',
        'Nova tarefa foi atribuída a você'
    ];

    if (Math.random() < 0.1) { // 10% chance every interval
        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        showNotification(randomNotification, 'info');
    }
}, 30000); // Check every 30 seconds

async function submitActivity() {
    const form = document.getElementById('activityForm');
    const formData = new FormData(form);
    
    // Validate required fields
    const title = formData.get('title');
    const datetime = formData.get('datetime');
    const type = formData.get('type');
    const activityId = formData.get('activityId');

    if (!title || !datetime || !type) {
        showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    const leadId = formData.get('leadId') ? parseInt(formData.get('leadId')) : null;
    const lead = leadId ? leads.find(l => l.id === leadId) : null;

    const activity = {
        lead_id: leadId,
        type: type,
        title: title,
        description: formData.get('description') || '',
        datetime: datetime
    };

    try {
        showNotification(activityId ? 'Atualizando atividade...' : 'Salvando atividade...', 'info');

        if (activityId) {
            // Update existing activity
            await fetchFromAPI(`/activities/${activityId}`, {
                method: 'PUT',
                body: JSON.stringify(activity)
            });

            await addLog({
                type: 'meeting',
                title: 'Atividade atualizada',
                description: `${activity.title}${lead ? ` para ${lead.name}` : ''} foi editada`,
                user_id: 'Usuário Atual',
                lead_id: leadId
            });

            showNotification('Atividade atualizada com sucesso!', 'success');
        } else {
            // Create new activity
            await fetchFromAPI('/activities', {
                method: 'POST',
                body: JSON.stringify(activity)
            });

            await addLog({
                type: 'meeting',
                title: 'Atividade agendada',
                description: `${activity.title}${lead ? ` para ${lead.name}` : ''}`,
                user_id: 'Usuário Atual',
                lead_id: leadId
            });

            showNotification('Atividade agendada com sucesso!', 'success');
        }

        // Reload calendar events from database
        if (calendar) {
            calendar.refetchEvents();
        }

        closeModal('activityModal');
        form.reset();

    } catch (error) {
        console.error('Erro ao salvar atividade:', error);
        showNotification('Erro ao salvar atividade. Tente novamente.', 'error');
    }
}

function openActivityEditModal(event) {
    const props = event.extendedProps;
    
    // Reset form
    const form = document.getElementById('activityForm');
    form.reset();
    
    // Populate form with event data
    document.getElementById('activityTitle').value = event.title;
    document.getElementById('activityType').value = props.type || 'meeting';
    document.getElementById('activityDescription').value = props.description || '';
    document.getElementById('activityLeadId').value = props.leadId || '';
    
    // Convert event start to local datetime format
    const startDate = new Date(event.start);
    const localDatetime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
    document.getElementById('activityDateTime').value = localDatetime.toISOString().slice(0, 16);
    
    // Add hidden field for activity ID
    let activityIdField = document.getElementById('activityId');
    if (!activityIdField) {
        activityIdField = document.createElement('input');
        activityIdField.type = 'hidden';
        activityIdField.name = 'activityId';
        activityIdField.id = 'activityId';
        form.appendChild(activityIdField);
    }
    activityIdField.value = event.id;
    
    // Populate leads dropdown if not already done
    const leadSelect = document.getElementById('activityLeadId');
    if (leadSelect && leadSelect.options.length <= 1) {
        leadSelect.innerHTML = '<option value="">Selecione um lead (opcional)</option>';
        leads.forEach(lead => {
            const option = document.createElement('option');
            option.value = lead.id;
            option.textContent = `${lead.name} - ${lead.company}`;
            leadSelect.appendChild(option);
        });
    }
    
    // Set selected lead if available
    if (props.leadId) {
        leadSelect.value = props.leadId;
    }
    
    // Change modal title and add delete button
    document.getElementById('activityModalTitle').textContent = 'Editar Atividade';
    
    // Add delete button to modal if not exists
    let deleteButton = document.getElementById('deleteActivityBtn');
    if (!deleteButton) {
        deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-danger';
        deleteButton.id = 'deleteActivityBtn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Excluir';
        deleteButton.onclick = () => deleteActivity(event.id);
        
        const modalFooter = document.querySelector('#activityModal .modal-footer');
        modalFooter.insertBefore(deleteButton, modalFooter.firstChild);
    }
    deleteButton.style.display = 'inline-block';
    
    // Open modal
    document.getElementById('activityModal').style.display = 'block';
}

async function deleteActivity(activityId) {
    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        text: 'Tem certeza que deseja excluir esta atividade?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
        color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
        try {
            await fetchFromAPI(`/activities/${activityId}`, {
                method: 'DELETE'
            });

            await addLog({
                type: 'meeting',
                title: 'Atividade excluída',
                description: 'Uma atividade foi removida do calendário',
                user_id: 'Usuário Atual'
            });

            // Reload calendar events
            if (calendar) {
                calendar.refetchEvents();
            }

            closeModal('activityModal');
            showNotification('Atividade excluída com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao excluir atividade:', error);
            showNotification('Erro ao excluir atividade', 'error');
        }
    }
}

async function submitNote() {
    const form = document.getElementById('noteForm');
    const formData = new FormData(form);
    const leadId = parseInt(formData.get('leadId'));
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
        showNotification('Lead não encontrado', 'error');
        return;
    }

    const note = formData.get('note');

    try {
        // Save note to database
        await fetchFromAPI('/notes', {
            method: 'POST',
            body: JSON.stringify({
                lead_id: leadId,
                content: note,
                color: 'blue',
                user_id: 'Usuário Atual'
            })
        });

        // Update local lead notes
        if (lead.notes) {
            lead.notes += '\n\n--- Nota ' + new Date().toLocaleString('pt-BR') + ' ---\n' + note;
        } else {
            lead.notes = note;
        }

        await addLog({
            type: 'note',
            title: 'Nota adicionada',
            description: `Nova nota adicionada para ${lead.name}`,
            user_id: 'Usuário Atual',
            lead_id: leadId
        });

        closeModal('noteModal');
        form.reset();
        renderLeadsTable();
        renderKanbanBoard();
        updatePipelineCounters();
        updateRecentEvents();
        showNotification('Nota adicionada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        showNotification('Erro ao salvar nota', 'error');
    }
}

function openLeadDetails(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showNotification('Lead não encontrado', 'error');
        return;
    }

    // Reset form first
    const form = document.getElementById('leadForm');
    form.reset();

    // Populate modal with lead data
    document.getElementById('leadId').value = lead.id || '';
    document.getElementById('leadName').value = lead.name || '';
    document.getElementById('leadCompany').value = lead.company || '';
    document.getElementById('leadEmail').value = lead.email || '';
    document.getElementById('leadPhone').value = lead.phone || '';
    document.getElementById('leadPosition').value = lead.position || '';
    document.getElementById('leadSource').value = lead.source || 'website';
    document.getElementById('leadStatus').value = lead.status || 'novo';
    document.getElementById('leadValue').value = lead.value || 0;
    document.getElementById('leadNotes').value = lead.notes || '';

    // Change modal title
    document.getElementById('leadModalTitle').textContent = `Editar Lead - ${lead.name}`;

    // Open modal
    document.getElementById('leadModal').style.display = 'block';
}

function editLead(leadId) {
    openLeadDetails(leadId);
}

async function deleteLead(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const result = await Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Tem certeza que deseja excluir o lead "${lead.name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar',
        background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
        color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b'
    });

    if (result.isConfirmed) {
        try {
            // Try to delete from server
            await fetchFromAPI(`/leads/${leadId}`, {
                method: 'DELETE'
            });

            // Remove lead from local array
            leads = leads.filter(l => l.id !== leadId);

            // Add log entry
            await addLog({
                type: 'lead',
                title: 'Lead excluído',
                description: `Lead ${lead.name} foi removido do sistema`,
                user_id: 'Usuário Atual',
                lead_id: leadId
            });

            // Re-render components
            renderLeadsTable();
            renderKanbanBoard();
            updatePipelineCounters();
            updateRecentEvents();

            Swal.fire({
                title: 'Excluído!',
                text: 'O lead foi excluído com sucesso.',
                icon: 'success',
                confirmButtonColor: '#10b981',
                background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
                color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b'
            });
        } catch (error) {
            console.error('Erro ao excluir lead:', error);
            showNotification('Erro ao excluir lead', 'error');
        }
    }
}

function scheduleActivity(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Set lead ID in activity modal
    document.getElementById('activityLeadId').value = leadId;

    // Open activity modal
    document.getElementById('activityModal').style.display = 'block';

    showNotification(`Agendando atividade para ${lead.name}`, 'info');
}

function addNote(leadId) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Set lead ID in note modal
    document.getElementById('noteLeadId').value = leadId;

    // Open note modal
    document.getElementById('noteModal').style.display = 'block';

    showNotification(`Adicionando nota para ${lead.name}`, 'info');
}

async function submitEvent() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    const eventId = formData.get('id');
    const leadId = parseInt(formData.get('leadId')) || null;

    const eventData = {
        title: formData.get('title'),
        type: formData.get('type'),
        start: formData.get('startDate'),
        end: formData.get('endDate'),
        description: formData.get('description'),
        location: formData.get('location'),
        participants: formData.get('participants'),
        reminder: parseInt(formData.get('reminder')) || null,
        leadId: leadId
    };

    try {
        // Add event to calendar
        if (calendar) {
            const calendarEvent = {
                id: eventId || Date.now().toString(),
                title: eventData.title,
                start: eventData.start,
                end: eventData.end || eventData.start,
                backgroundColor: getEventColor(eventData.type),
                borderColor: getEventColor(eventData.type),
                extendedProps: {
                    type: eventData.type,
                    description: eventData.description,
                    location: eventData.location,
                    participants: eventData.participants,
                    leadId: leadId
                }
            };

            if (eventId) {
                // Update existing event
                const existingEvent = calendar.getEventById(eventId);
                if (existingEvent) {
                    existingEvent.setProp('title', eventData.title);
                    existingEvent.setStart(eventData.start);
                    existingEvent.setEnd(eventData.end);
                    existingEvent.setExtendedProp('type', eventData.type);
                    existingEvent.setExtendedProp('description', eventData.description);
                    existingEvent.setExtendedProp('location', eventData.location);
                    existingEvent.setExtendedProp('participants', eventData.participants);
                    existingEvent.setExtendedProp('leadId', leadId);
                }
            } else {
                // Add new event
                calendar.addEvent(calendarEvent);
            }
        }

        // Log the event creation/update
        const lead = leadId ? leads.find(l => l.id === leadId) : null;
        await addLog({
            type: 'meeting',
            title: eventId ? 'Atividade atualizada' : 'Nova atividade agendada',
            description: `${eventData.title}${lead ? ` para ${lead.name}` : ''} - ${formatDateTime(eventData.start)}`,
            user_id: 'Usuário Atual',
            lead_id: leadId
        });

        showNotification(eventId ? 'Atividade atualizada com sucesso!' : 'Atividade agendada com sucesso!', 'success');

        closeModal('eventModal');
        form.reset();
        document.getElementById('eventModalTitle').textContent = 'Nova Atividade';

    } catch (error) {
        console.error('Erro ao salvar atividade:', error);
        showNotification('Erro ao salvar atividade', 'error');
    }
}

function getEventColor(type) {
    const colors = {
        meeting: '#3b82f6',
        call: '#10b981',
        email: '#f59e0b',
        demo: '#8b5cf6',
        'follow-up': '#06b6d4',
        task: '#ef4444'
    };
    return colors[type] || '#3b82f6';
}

async function submitTask() {
    const form = document.getElementById('taskForm');
    const formData = new FormData(form);
    const taskId = formData.get('id');

    const taskData = {
        title: formData.get('title'),
        description: formData.get('description'),
        dueDate: formData.get('dueDate'),
        priority: formData.get('priority'),
        status: 'pending',
        leadId: parseInt(formData.get('leadId')) || null,
        assignee: formData.get('assignee')
    };

    try {
        if (taskId) {
            // Edit existing task
            const updatedTask = await fetchFromAPI(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({...taskData, id: parseInt(taskId)})
            });

            // Update local array
            const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex !== -1) {
                tasks[taskIndex] = {...tasks[taskIndex], ...taskData, id: parseInt(taskId)};
            }

            await addLog({
                type: 'task',
                title: 'Tarefa atualizada',
                description: `Tarefa "${taskData.title}" foi editada`,
                user_id: 'Usuário Atual',
                lead_id: taskData.leadId
            });

            showNotification('Tarefa atualizada com sucesso!', 'success');
        } else {
            // Create new task
            const newTask = await fetchFromAPI('/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });

            // Add to local array
            tasks.push(newTask);

            await addLog({
                type: 'task',
                title: 'Nova tarefa criada',
                description: `Tarefa "${taskData.title}" foi adicionada ao sistema`,
                user_id: 'Usuário Atual',
                lead_id: taskData.leadId
            });

            showNotification('Tarefa criada com sucesso!', 'success');
        }

        // Re-render tasks list
        renderTasksList();

        closeModal('taskModal');
        form.reset();
        document.getElementById('taskModalTitle').textContent = 'Nova Tarefa';

    } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        showNotification('Erro ao salvar tarefa', 'error');
    }
}

function openLogDetails(logIndex) {
    // Apply the same filters to get the filtered logs
    let filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];

        if (logsFilters.startDate && logDate < logsFilters.startDate) return false;
        if (logsFilters.endDate && logDate > logsFilters.endDate) return false;
        if (logsFilters.type && log.type !== logsFilters.type) return false;

        return true;
    });

    const sortedLogs = filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const log = sortedLogs[logIndex];

    if (!log) {
        showNotification('Log não encontrado', 'error');
        return;
    }

    // Get related lead information if available
    let leadInfo = '';
    if (log.lead_id || log.leadId) {
        const lead = leads.find(l => l.id === (log.lead_id || log.leadId));
        if (lead) {
            leadInfo = `
                <div class="log-detail-section">
                    <h4><i class="fas fa-user"></i> Lead Relacionado</h4>
                    <p><strong>Nome:</strong> ${lead.name}</p>
                    <p><strong>Empresa:</strong> ${lead.company}</p>
                    <p><strong>Email:</strong> ${lead.email}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${lead.status}">${getStatusLabel(lead.status)}</span></p>
                </div>
            `;
        }
    }

    // Get type icon and color
    const typeIcons = {
        lead: { icon: 'user-plus', color: '#3b82f6' },
        email: { icon: 'envelope', color: '#10b981' },
        call: { icon: 'phone', color: '#f59e0b' },
        task: { icon: 'tasks', color: '#8b5cf6' },
        meeting: { icon: 'calendar', color: '#ef4444' },
        note: { icon: 'sticky-note', color: '#06b6d4' }
    };

    const typeInfo = typeIcons[log.type] || { icon: 'info-circle', color: '#6b7280' };

    // Build modal content
    const modalContent = `
        <div class="log-details-container">
            <div class="log-detail-header">
                <div class="log-detail-icon" style="background-color: ${typeInfo.color};">
                    <i class="fas fa-${typeInfo.icon}"></i>
                </div>
                <div class="log-detail-title">
                    <h3>${log.title}</h3>
                    <span class="log-detail-type">${getLogTypeLabel(log.type)}</span>
                </div>
            </div>

            <div class="log-detail-section">
                <h4><i class="fas fa-align-left"></i> Descrição</h4>
                <p>${log.description}</p>
            </div>

            <div class="log-detail-section">
                <h4><i class="fas fa-clock"></i> Informações Temporais</h4>
                <p><strong>Data/Hora:</strong> ${formatDateTime(log.timestamp)}</p>
                <p><strong>Usuário:</strong> ${log.user_id || log.userId}</p>
            </div>

            ${leadInfo}

            <div class="log-detail-section">
                <h4><i class="fas fa-info-circle"></i> Informações Técnicas</h4>
                <p><strong>ID do Log:</strong> ${log.id || 'N/A'}</p>
                <p><strong>Tipo:</strong> ${log.type}</p>
                ${log.lead_id || log.leadId ? `<p><strong>Lead ID:</strong> ${log.lead_id || log.leadId}</p>` : ''}
            </div>
        </div>
    `;

    // Set modal content and show
    document.getElementById('logDetailsContent').innerHTML = modalContent;
    document.getElementById('logDetailsTitle').textContent = `Detalhes do Log - ${log.title}`;
    document.getElementById('logDetailsModal').style.display = 'block';
}

function getLogTypeLabel(type) {
    const labels = {
        lead: 'Lead',
        email: 'Email',
        call: 'Ligação',
        task: 'Tarefa',
        meeting: 'Reunião',
        note: 'Nota'
    };
    return labels[type] || type;
}

function openRecentEventDetails(eventIndex) {
    // Get the same sorted logs as in updateRecentEvents
    const recentLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    const log = recentLogs[eventIndex];

    if (!log) {
        showNotification('Evento não encontrado', 'error');
        return;
    }

    // Get related lead information if available
    let leadInfo = '';
    if (log.lead_id || log.leadId) {
        const lead = leads.find(l => l.id === (log.lead_id || log.leadId));
        if (lead) {
            leadInfo = `
                <div class="log-detail-section">
                    <h4><i class="fas fa-user"></i> Lead Relacionado</h4>
                    <p><strong>Nome:</strong> ${lead.name}</p>
                    <p><strong>Empresa:</strong> ${lead.company}</p>
                    <p><strong>Email:</strong> ${lead.email}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${lead.status}">${getStatusLabel(lead.status)}</span></p>
                </div>
            `;
        }
    }

    // Get type icon and color
    const typeIcons = {
        lead: { icon: 'user-plus', color: '#3b82f6' },
        email: { icon: 'envelope', color: '#10b981' },
        call: { icon: 'phone', color: '#f59e0b' },
        task: { icon: 'tasks', color: '#8b5cf6' },
        meeting: { icon: 'calendar', color: '#ef4444' },
        note: { icon: 'sticky-note', color: '#06b6d4' }
    };

    const typeInfo = typeIcons[log.type] || { icon: 'info-circle', color: '#6b7280' };

    // Build modal content
    const modalContent = `
        <div class="log-details-container">
            <div class="log-detail-header">
                <div class="log-detail-icon" style="background-color: ${typeInfo.color};">
                    <i class="fas fa-${typeInfo.icon}"></i>
                </div>
                <div class="log-detail-title">
                    <h3>${log.title}</h3>
                    <span class="log-detail-type">${getLogTypeLabel(log.type)}</span>
                </div>
            </div>

            <div class="log-detail-section">
                <h4><i class="fas fa-align-left"></i> Descrição</h4>
                <p>${log.description}</p>
            </div>

            <div class="log-detail-section">
                <h4><i class="fas fa-clock"></i> Informações Temporais</h4>
                <p><strong>Data/Hora:</strong> ${formatDateTime(log.timestamp)}</p>
                <p><strong>Usuário:</strong> ${log.user_id || log.userId}</p>
            </div>

            ${leadInfo}

            <div class="log-detail-section">
                <h4><i class="fas fa-info-circle"></i> Informações Técnicas</h4>
                <p><strong>ID do Log:</strong> ${log.id || 'N/A'}</p>
                <p><strong>Tipo:</strong> ${log.type}</p>
                ${log.lead_id || log.leadId ? `<p><strong>Lead ID:</strong> ${log.lead_id || log.leadId}</p>` : ''}
            </div>
        </div>
    `;

    // Set modal content and show
    document.getElementById('logDetailsContent').innerHTML = modalContent;
    document.getElementById('logDetailsTitle').textContent = `Detalhes do Evento - ${log.title}`;
    document.getElementById('logDetailsModal').style.display = 'block';
}

function setupPipelineDragDrop() {
    // Set up drag and drop for pipeline events
    document.querySelectorAll('.pipeline-event').forEach(event => {
        event.setAttribute('draggable', 'true');
        
        event.addEventListener('dragstart', (e) => {
            const status = e.currentTarget.getAttribute('data-status');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'pipeline-event',
                status: status,
                title: `Novo evento ${getStatusLabel(status)}`,
                description: `Evento criado para status ${getStatusLabel(status)}`
            }));
            e.currentTarget.style.opacity = '0.5';
        });

        event.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
        });
    });

    // Set up drop zone for calendar
    const calendarWidget = document.getElementById('calendar-widget');
    if (calendarWidget) {
        calendarWidget.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        calendarWidget.addEventListener('drop', (e) => {
            e.preventDefault();
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'pipeline-event') {
                    // Get the clicked date if available, otherwise use today
                    const clickedDate = new Date();
                    clickedDate.setHours(9, 0, 0, 0);

                    // Pre-fill the activity modal with pipeline data
                    document.getElementById('activityType').value = 'meeting';
                    document.getElementById('activityTitle').value = data.title;
                    document.getElementById('activityDescription').value = data.description;
                    document.getElementById('activityDateTime').value = clickedDate.toISOString().slice(0, 16);
                    
                    // Open activity modal
                    document.getElementById('activityModal').style.display = 'block';
                    
                    showNotification(`Criando evento para ${data.status}`, 'info');
                }
            } catch (error) {
                console.error('Erro ao processar drop:', error);
            }
        });
    }
}

//```javascript
// Export functions for global access
window.toggleTheme = toggleTheme;
window.openLeadModal = openLeadModal;
window.closeModal = closeModal;
window.submitLead = submitLead;
window.submitActivity = submitActivity;
window.submitNote = submitNote;
window.submitTask = submitTask;
window.submitEvent = submitEvent;
window.openLeadDetails = openLeadDetails;
window.openEventModal = openEventModal;
window.openTaskModal = openTaskModal;
window.toggleTaskStatus = toggleTaskStatus;
window.editLead = editLead;
window.deleteLead = deleteLead;
window.scheduleActivity = scheduleActivity;
window.addNote = addNote;
window.changeLogsPage = changeLogsPage;
window.openTaskDetails = openTaskDetails;
window.applyLogsFilters = applyLogsFilters;
window.openNewCardModal = openNewCardModal;
window.submitNewCard = submitNewCard;
window.openLogDetails = openLogDetails;
window.openRecentEventDetails = openRecentEventDetails;
window.openActivityEditModal = openActivityEditModal;
window.deleteActivity = deleteActivity;

// Lead Notes Management
async function loadAllLeadNotes() {
    try {
        // Fetch lead notes from the API
        const notes = await fetchFromAPI('/notes');

        // Iterate through each lead and assign its notes
        leads.forEach(lead => {
            lead.notes = notes.filter(note => note.lead_id === lead.id).map(note => note.content).join('\n\n---\n\n') || '';
        });
    } catch (error) {
        console.error('Erro ao carregar notas dos leads:', error);
        showNotification('Erro ao carregar notas dos leads', 'error');
    }
}

// New Card Functionality
function openNewCardModal(status) {
    // Set the default status for the new card
    document.getElementById('newCardStatus').value = status;

    // Open the modal
    document.getElementById('newCardModal').style.display = 'block';
}

async function submitNewCard() {
    const form = document.getElementById('newCardForm');
    const formData = new FormData(form);

    const newLeadData = {
        name: formData.get('name'),
        company: formData.get('company'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        position: formData.get('position'),
        status: formData.get('status'),
        source: formData.get('source'),
        responsible: 'Usuário Atual',
        score: 50,
        temperature: formData.get('temperature') || 'morno',
        value: parseFloat(formData.get('value')) || 0,
        notes: formData.get('notes'),
        lastContact: new Date().toISOString().split('T')[0]
    };

    try {
        // Create new lead
        const newLead = await fetchFromAPI('/leads', {
            method: 'POST',
            body: JSON.stringify(newLeadData)
        });

        // Add to local array
        leads.push(newLead);

        await addLog({
            type: 'lead',
            title: 'Novo lead criado',
            description: `Lead ${newLeadData.name} foi adicionado ao sistema via Kanban`,
            user_id: 'Usuário Atual',
            lead_id: newLead.id
        });

        showNotification('Lead criado com sucesso!', 'success');

        // Re-render components
        renderLeadsTable();
        renderKanbanBoard();
        updatePipelineCounters();
        updateRecentEvents();

        closeModal('newCardModal');
        form.reset();

    } catch (error) {
        console.error('Erro ao salvar lead:', error);
        showNotification('Erro ao salvar lead', 'error');
    }
}

<<<<<<< HEAD
//Recent History
function renderRecentHistory() {
    const recentHistoryList = document.getElementById('recentHistoryList');
    if (!recentHistoryList) return;

    // Combine logs and calendar events (if calendar exists), sort by timestamp
    let combinedHistory = [...logs];
    
    if (calendar && calendar.getEvents) {
        const calendarEvents = calendar.getEvents().map(event => ({
            type: 'calendar',
            title: event.title,
            description: event.extendedProps?.description || '',
            timestamp: event.startStr,
            userId: 'Sistema'
        }));
        combinedHistory = [...logs, ...calendarEvents];
    }

    combinedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Take the 5 most recent items
    const recentItems = combinedHistory.slice(0, 5);

    recentHistoryList.innerHTML = recentItems.map(item => `
        <div class="history-item">
            <i class="fas fa-${getHistoryIcon(item.type)}"></i>
            <div class="history-content">
                <div class="history-title">${item.title}</div>
                <div class="history-description">${item.description}</div>
                <div class="history-time">${formatDateTime(item.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function getHistoryIcon(type) {
    const icons = {
        lead: 'user-plus',
        email: 'envelope',
        call: 'phone',
        task: 'tasks',
        meeting: 'calendar-alt',
        note: 'sticky-note',
        calendar: 'calendar-alt'
    };
    return icons[type] || 'info-circle';
=======
// New functions to update the counters and recent events
function updatePipelineCounters() {
    const counters = {
        novo: 0,
        contato: 0,
        qualificado: 0,
        proposta: 0,
        negociacao: 0,
        ganho: 0
    };

    leads.forEach(lead => {
        counters[lead.status]++;
    });

    // Update sidebar pipeline counters
    Object.keys(counters).forEach(status => {
        const counterElement = document.getElementById(`pipeline-${status}`);
        if (counterElement) {
            counterElement.textContent = counters[status];
        }
    });

    const pipelineCountersDiv = document.getElementById('pipelineCounters');
    if (pipelineCountersDiv) {
        pipelineCountersDiv.innerHTML = `
            <div class="pipeline-counter">Novo: ${counters.novo}</div>
            <div class="pipeline-counter">Primeiro Contato: ${counters.contato}</div>
            <div class="pipeline-counter">Qualificado: ${counters.qualificado}</div>
            <div class="pipeline-counter">Proposta: ${counters.proposta}</div>
            <div class="pipeline-counter">Negociação: ${counters.negociacao}</div>
            <div class="pipeline-counter">Ganho: ${counters.ganho}</div>
        `;
    }
}

function updateRecentEvents() {
    // Get the 5 most recent logs
    const recentLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    const recentEventsDiv = document.getElementById('recentEvents');
    if (recentEventsDiv) {
        if (recentLogs.length === 0) {
            recentEventsDiv.innerHTML = '<div class="empty-events">Nenhum evento recente</div>';
        } else {
            recentEventsDiv.innerHTML = recentLogs.map((log, index) => `
                <div class="recent-event" onclick="openRecentEventDetails(${index})" title="Clique para ver detalhes">
                    <div class="recent-event-title">${log.title}</div>
                    <div class="recent-event-meta">
                        <span class="recent-event-date">${formatDate(log.timestamp)}</span>
                        <span class="recent-event-user">${log.userId || log.user_id}</span>
                    </div>
                </div>
            `).join('');
        }
    }
>>>>>>> c05725699305ce853548609181118729df793dec
}