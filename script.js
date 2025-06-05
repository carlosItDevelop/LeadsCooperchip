// Global Variables
let currentTheme = 'dark';
let calendar;
let charts = {};
let leads = [];
let tasks = [];
let logs = [];
let draggedCard = null;

// API Base URL - verificar se estamos no Vite dev server ou servidor Node.js
const API_BASE = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

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

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    initializeCharts();
    initializeCalendar();
});

function initializeApp() {
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    // Handle initial URL hash
    const initialTab = window.location.hash.slice(1) || 'dashboard';
    showTab(initialTab);

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
        const tab = window.location.hash.slice(1) || 'dashboard';
        showTab(tab);
        
        // Update active nav
        const navTab = document.querySelector(`[data-tab="${tab}"]`);
        if (navTab) {
            updateActiveNav(navTab);
        }
    });

    // Initialize service worker for notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }
}

function setupEventListeners() {
    // Navigation - usar delegação de eventos para garantir que funcione
    document.addEventListener('click', (e) => {
        const navTab = e.target.closest('[data-tab]');
        if (navTab) {
            e.preventDefault();
            e.stopPropagation();
            
            const tab = navTab.getAttribute('data-tab');
            console.log('Clique em tab:', tab);
            
            if (tab) {
                showTab(tab);
                updateActiveNav(navTab);
            }
        }
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
    const statusFilter = document.getElementById('statusFilter');
    const responsibleFilter = document.getElementById('responsibleFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterLeads);
    }
    if (responsibleFilter) {
        responsibleFilter.addEventListener('change', filterLeads);
    }

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
}

// Function to format logs from database
function formatLogsFromDatabase(dbLogs) {
    return dbLogs.map(log => ({
        id: log.id,
        type: log.type,
        title: log.action,
        description: log.details,
        timestamp: log.created_at,
        userId: log.user_id,
        leadId: log.lead_id
    }));
}

async function loadSampleData() {
    try {
        console.log('Carregando dados do servidor...');

        // Try to load data directly without health check first
        const rawLeads = await fetchFromAPI('/leads');
        const rawTasks = await fetchFromAPI('/tasks');
        const rawLogs = await fetchFromAPI('/logs');

        // Format data properly
        leads = rawLeads;
        tasks = rawTasks;
        logs = formatLogsFromDatabase(rawLogs);

        console.log('Dados carregados:', { leads: leads.length, tasks: tasks.length, logs: logs.length });

        renderLeadsTable();
        renderKanbanBoard();
        renderTasksList();
        renderLogsTimeline();

        showNotification('✅ Dados carregados do servidor', 'success');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('⚠️ Modo offline: Usando dados de exemplo', 'warning');

        // Fallback para dados de exemplo se o servidor não estiver disponível
        leads = sampleLeads;
        tasks = sampleTasks;
        logs = sampleLogs;

        renderLeadsTable();
        renderKanbanBoard();
        renderTasksList();
        renderLogsTimeline();
    }
}

// Função para fazer requisições à API
async function fetchFromAPI(endpoint, options = {}) {
    try {
        console.log(`Fazendo requisição para: ${API_BASE + endpoint}`);

        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        console.log(`Resposta recebida: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${response.status} - ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Handle empty responses (like DELETE requests)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('Dados recebidos:', data);
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro na API:', error);

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Erro de conexão: Verifique se o servidor está rodando na porta 5000.', 'error');
        } else {
            showNotification(`Erro de conexão: ${error.message}`, 'error');
        }
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
    console.log('Navegando para tab:', tabName);
    
    // Remove # se existir no nome da tab
    tabName = tabName.replace('#', '');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('Tab ativada:', tabName);
        
        // Update URL without causing page reload
        if (window.history && window.history.pushState) {
            window.history.pushState(null, '', `#${tabName}`);
        }
    } else {
        console.error('Tab não encontrada:', tabName);
        // Fallback para dashboard se tab não existir
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab) {
            dashboardTab.classList.add('active');
            if (window.history && window.history.pushState) {
                window.history.pushState(null, '', '#dashboard');
            }
        }
    }

    // Refresh content based on tab
    switch(tabName) {
        case 'calendar':
            if (calendar) {
                setTimeout(() => calendar.render(), 100);
            }
            break;
        case 'reports':
            setTimeout(() => updateCharts(), 100);
            break;
        case 'leads-list':
            renderLeadsTable();
            break;
        case 'kanban':
            renderKanbanBoard();
            break;
        case 'tasks':
            renderTasksList();
            break;
        case 'logs':
            renderLogsTimeline();
            break;
    }
}

function updateActiveNav(activeItem) {
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(item => {
        item.classList.remove('active');
    });
    
    if (activeItem) {
        activeItem.classList.add('active');
        console.log('Nav item ativado:', activeItem.getAttribute('data-tab'));
    } else {
        // Se não há item ativo especificado, ativar com base no hash atual
        const currentTab = window.location.hash.slice(1) || 'dashboard';
        const navTab = document.querySelector(`[data-tab="${currentTab}"]`);
        if (navTab) {
            navTab.classList.add('active');
        }
    }
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
            <td>${lead.assigned_to || lead.responsible || 'Não atribuído'}</td>
            <td>${formatDate(lead.lastContact || lead.created_at)}</td>
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
        showNotification('Status do lead atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        showNotification('Erro ao atualizar status do lead', 'error');

        // Revert the visual change if API call failed
        lead.status = oldStatus;
        renderKanbanBoard();
        renderLeadsTable();
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
        events: [
            {
                id: '1',
                title: 'Reunião com João Silva',
                start: '2024-01-20T14:00:00',
                end: '2024-01-20T15:00:00',
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                extendedProps: {
                    leadId: 1,
                    type: 'meeting',
                    description: 'Apresentação de proposta comercial'
                }
            },
            {
                id: '2',
                title: 'Follow-up Ana Costa',
                start: '2024-01-22T10:00:00',
                end: '2024-01-22T10:30:00',
                backgroundColor: '#10b981',
                borderColor: '#059669',
                extendedProps: {
                    leadId: 2,
                    type: 'call',
                    description: 'Verificar status da proposta'
                }
            },
            {
                id: '3',
                title: 'Demonstração Tech Corp',
                start: '2024-01-25T16:00:00',
                end: '2024-01-25T17:30:00',
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                extendedProps: {
                    leadId: 1,
                    type: 'demo',
                    description: 'Demonstração da plataforma'
                }
            }
        ],
        eventClick: function(info) {
            const event = info.event;
            const props = event.extendedProps;

            Swal.fire({
                title: event.title,
                html: `
                    <div style="text-align: left;">
                        <p><strong>Início:</strong> ${event.start.toLocaleString('pt-BR')}</p>
                        ${event.end ? `<p><strong>Término:</strong> ${event.end.toLocaleString('pt-BR')}</p>` : ''}
                        <p><strong>Tipo:</strong> ${props.type || 'Atividade'}</p>
                        ${props.description ? `<p><strong>Descrição:</strong> ${props.description}</p>` : ''}
                        ${props.leadId ? `<p><strong>Lead ID:</strong> ${props.leadId}</p>` : ''}
                    </div>
                `,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Editar',
                cancelButtonText: 'Fechar',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#6b7280',
                background: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
                color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b'
            }).then((result) => {
                if (result.isConfirmed) {
                    showNotification('Funcionalidade de edição em desenvolvimento', 'info');
                }
            });
        },
        dateClick: function(info) {
            // Set default date/time for new event
            const clickedDate = new Date(info.date);
            clickedDate.setHours(9, 0, 0, 0);

            document.getElementById('activityDateTime').value = clickedDate.toISOString().slice(0, 16);
            document.getElementById('activityModal').style.display = 'block';
        },
        eventDidMount: function(info) {
            // Add tooltip
            info.el.setAttribute('title', info.event.title + '\n' + (info.event.extendedProps.description || ''));
        }
    });
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
    const ctx = document.getElementById('funnelChart');
    if (!ctx) return;

    charts.funnel = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Novos', 'Contato', 'Qualificados', 'Proposta', 'Negociação', 'Ganhos'],
            datasets: [{
                label: 'Quantidade de Leads',
                data: [150, 120, 80, 45, 25, 15],
                backgroundColor: [
                    '#6366f1',
                    '#f59e0b',
                    '#10b981',
                    '#8b5cf6',
                    '#ef4444',
                    '#06b6d4'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                },
                x: {
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                }
            }
        }
    });
}

function initializeSourceChart() {
    const ctx = document.getElementById('sourceChart');
    if (!ctx) return;

    charts.source = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Website', 'Indicação', 'Redes Sociais', 'Eventos', 'Cold Call'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ef4444'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                }
            }
        }
    });
}

function initializeSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    charts.sales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Vendas Realizadas',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b',
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                },
                x: {
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                }
            }
        }
    });
}

function initializeConversionChart() {
    const ctx = document.getElementById('conversionChart');
    if (!ctx) return;

    ```text
charts.conversion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Maria Santos', 'Carlos Oliveira', 'Ana Silva', 'Pedro Costa'],
            datasets: [{
                label: 'Taxa de Conversão (%)',
                data: [85, 78, 92, 68],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                },
                x: {
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                }
            }
        }
    });
}

function initializeActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    charts.activity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: '📞 Ligações',
                data: [45, 52, 38, 67, 59, 73],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 3,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: '🤝 Reuniões',
                data: [28, 35, 42, 31, 45, 38],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 3,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: '📧 Emails',
                data: [85, 93, 78, 102, 89, 95],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: false,
                borderWidth: 3,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: currentTheme === 'dark' ? '#f1f5f9' : '#1e293b',
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                },
                x: {
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b'
                    }
                }
            }
        }
    });
}

function initializePipelineTimeChart() {
    const ctx = document.getElementById('pipelineTimeChart');
    if (!ctx) return;

    charts.pipelineTime = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Novo → Contato', 'Contato → Qualificado', 'Qualificado → Proposta', 'Proposta → Negociação', 'Negociação → Ganho'],
            datasets: [{
                label: 'Tempo Médio (dias)',
                data: [3, 7, 5, 12, 8],
                backgroundColor: [
                    '#6366f1',
                    '#f59e0b',
                    '#10b981',
                    '#8b5cf6',
                    '#ef4444'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b',
                        callback: function(value) {
                            return value + ' dias';
                        }
                    }
                },
                x: {
                    grid: {
                        color: currentTheme === 'dark' ? '#334155' : '#e2e8f0'
                    },
                    ticks: {
                        color: currentTheme === 'dark' ? '#cbd5e1' : '#64748b',
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

function updateCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.update();
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
            ${paginatedLogs.map(log => `
                <div class="log-item">
                    <div class="log-icon">
                        <i class="fas fa-${getLogIcon(log.type)}"></i>
                    </div>
                    <div class="log-content">
                        <div class="log-title">${log.title}</div>
                        <div class="log-description">${log.description}</div>
                        <div class="log-time">${formatDateTime(log.timestamp)} - ${log.userId}</div>
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
            type: logEntry.type || 'activity',
            action: logEntry.title || logEntry.action || 'Ação realizada',
            details: logEntry.description || logEntry.details || '',
            user_id: logEntry.user_id || logEntry.userId || 'Usuário Atual',
            lead_id: logEntry.lead_id || logEntry.leadId || null
        };

        console.log('Tentando salvar log:', dbLogEntry);

        // Try to save log to server directly
        const newLog = await fetchFromAPI('/logs', {
            method: 'POST',
            body: JSON.stringify(dbLogEntry)
        });

        console.log('Log salvo com sucesso:', newLog);

        // Adicionar o log localmente para exibição imediata
        if (newLog) {
            const formattedLog = {
                id: newLog.id,
                type: newLog.type,
                title: newLog.action,
                description: newLog.details,
                timestamp: newLog.created_at,
                userId: newLog.user_id,
                leadId: newLog.lead_id
            };

            logs.unshift(formattedLog);
            renderLogsTimeline();
        }
    } catch (error) {
        console.error('Erro ao adicionar log:', error);

        // Fallback: adicionar log localmente mesmo se falhar no servidor
        const fallbackLog = {
            id: Date.now(),
            type: logEntry.type || 'activity',
            title: logEntry.title || logEntry.action || 'Ação realizada',
            description: logEntry.description || logEntry.details || '',
            timestamp: new Date().toISOString(),
            userId: logEntry.user_id || logEntry.userId || 'Usuário Atual',
            leadId: logEntry.lead_id || logEntry.leadId || null
        };

        logs.unshift(fallbackLog);
        renderLogsTimeline();

        showNotification('⚠️ Modo offline: Log salvo localmente', 'warning');
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
    showNotification('Modal de evento seria aberto aqui', 'info');
}

function openTaskModal() {
    showNotification('Modal de tarefa seria aberto aqui', 'info');
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
                action: 'Lead atualizado',
                details: `Lead ${leadData.name} foi editado`,
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
                action: 'Novo lead criado',
                details: `Lead ${leadData.name} foi adicionado ao sistema`,
                user_id: 'Usuário Atual',
                lead_id: newLead.id
            });

            showNotification('Lead criado com sucesso!', 'success');
        }

        // Re-render components
        renderLeadsTable();
        renderKanbanBoard();

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
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function filterLeads() {
    const searchInput = document.querySelector('.search-input');
    const statusFilter = document.getElementById('statusFilter');
    const responsibleFilter = document.getElementById('responsibleFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';
    const selectedResponsible = responsibleFilter ? responsibleFilter.value : '';

    let filteredLeads = leads.filter(lead => {
        // Search filter
        const matchesSearch = !searchTerm || 
            lead.name.toLowerCase().includes(searchTerm) ||
            lead.company.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStatus = !selectedStatus || lead.status === selectedStatus;

        // Responsible filter
        const responsibleName = lead.assigned_to || lead.responsible || '';
        const matchesResponsible = !selectedResponsible || 
            responsibleName.toLowerCase().includes(selectedResponsible.toLowerCase());

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
            <td>${lead.assigned_to || lead.responsible || 'Não atribuído'}</td>
            <td>${formatDate(lead.lastContact || lead.created_at)}</td>
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

function submitActivity() {
    const form = document.getElementById('activityForm');
    const formData = new FormData(form);
    const leadId = parseInt(formData.get('leadId'));
    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    const activity = {
        id: Date.now(),
        leadId: leadId,
        type: formData.get('type'),
        title: formData.get('title'),
        description: formData.get('description'),
        datetime: formData.get('datetime'),
        createdAt: new Date().toISOString()
    };

    // Add to calendar events (in real app, this would be stored)
    if (calendar) {
        calendar.addEvent({
            title: activity.title,
            start: activity.datetime,
            backgroundColor: '#3b82f6',
            extendedProps: {
                leadId: leadId,
                leadName: lead.name,
                type: activity.type
            }
        });
    }

    addLog({
        type: 'meeting',
        title: 'Atividade agendada',
        description: `${activity.title} agendada para ${lead.name}`,
        user_id: 'Usuário Atual',
        lead_id: leadId
    });

    closeModal('activityModal');
    form.reset();
    showNotification('Atividade agendada com sucesso!', 'success');
}

function submitNote() {
    const form = document.getElementById('noteForm');
    const formData = new FormData(form);
    const leadId = parseInt(formData.get('leadId'));
    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    const note = formData.get('note');

    // Add note to lead (in real app, this would be stored in database)
    if (lead.notes) {
        lead.notes += '\n\n--- Nota ' + new Date().toLocaleString('pt-BR') + ' ---\n' + note;
    } else {
        lead.notes = note;
    }

    addLog({
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
    showNotification('Nota adicionada com sucesso!', 'success');
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

// Export functions for global access
window.toggleTheme = toggleTheme;
window.openLeadModal = openLeadModal;
window.closeModal = closeModal;
window.submitLead = submitLead;
window.submitActivity = submitActivity;
window.submitNote = submitNote;
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