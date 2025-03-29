// DOM Elements
const inputBox = document.getElementById('input-box');
const listContainer = document.getElementById('list-container');
const taskCount = document.getElementById('task-count');
const completedCount = document.getElementById('completed-count');
const emptyState = document.getElementById('empty-state');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const motivationalQuote = document.getElementById('motivational-quote');
const inspirationTip = document.getElementById('inspiration-tip');
const notification = document.getElementById('notification');
const confettiContainer = document.getElementById('confetti-container');
const themeToggle = document.getElementById('theme-toggle');
const voiceInputBtn = document.getElementById('voice-input');
const prioritySelect = document.getElementById('priority-select');
const categorySelect = document.getElementById('category-select');
const dueDateInput = document.getElementById('due-date');
const analyticsModal = document.getElementById('analytics-modal');

// State
let tasks = [];
let draggedItem = null;

// Initialize the app
function init() {
    loadTasks();
    updateTaskCount();
    updateProgress();
    updateMotivationalElements();
    setupEventListeners();
    setupDragAndDrop();
    checkNotificationPermission();
    showWelcomeNotification();
}

// Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('todo-tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    }
    checkEmptyState();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('todo-tasks', JSON.stringify(tasks));
    updateTaskCount();
    updateProgress();
}

// Render all tasks
function renderTasks(filter = 'all') {
    listContainer.innerHTML = '';
    
    const filteredTasks = tasks.filter(task => {
        if (filter === 'active') return !task.completed;
        if (filter === 'completed') return task.completed;
        return true;
    });
    
    if (filteredTasks.length === 0) {
        checkEmptyState();
        return;
    }
    
    filteredTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `priority-${task.priority}`;
        if (task.completed) li.classList.add('checked');
        li.draggable = true;
        li.dataset.id = task.id;
        
        // Parse due date
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const now = new Date();
        const isOverdue = dueDate && dueDate < now && !task.completed;
        
        li.innerHTML = `
            ${task.text}
            ${dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar-alt"></i> ${formatDueDate(dueDate)}
            </span>` : ''}
            ${task.category !== 'general' ? `<span class="task-category">${task.category}</span>` : ''}
            <span class="delete-btn"><i class="fas fa-times"></i></span>
        `;
        
        listContainer.appendChild(li);
    });
    
    checkEmptyState();
}

// Format due date for display
function formatDueDate(date) {
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Add a new task
function addTask() {
    const text = inputBox.value.trim();
    if (!text) {
        showNotification('Please enter a task!', 'fas fa-exclamation-circle');
        return;
    }
    
    // Parse natural language for due date
    const parsedDate = parseNaturalLanguageDate(text);
    const cleanText = parsedDate ? text.replace(/(today|tomorrow|next week|at \d{1,2}(:\d{2})?(am|pm)?)/gi, '').trim() : text;
    
    const newTask = {
        id: Date.now().toString(),
        text: cleanText,
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: parsedDate || (dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    
    // Reset input
    inputBox.value = '';
    dueDateInput.value = '';
    
    showNotification('Task added!', 'fas fa-check-circle');
}

// Parse natural language dates
function parseNaturalLanguageDate(text) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Match patterns like "tomorrow at 5pm"
    const timeMatch = text.match(/(at )?(\d{1,2})(:\d{2})?(am|pm)?/i);
    const dateMatch = text.match(/(today|tomorrow|next week)/i);
    
    let date = new Date();
    
    if (dateMatch) {
        const match = dateMatch[0].toLowerCase();
        if (match === 'today') date = today;
        if (match === 'tomorrow') date = tomorrow;
        if (match === 'next week') date.setDate(date.getDate() + 7);
    }
    
    if (timeMatch) {
        let hours = parseInt(timeMatch[2]);
        const minutes = timeMatch[3] ? parseInt(timeMatch[3].substring(1)) : 0;
        const period = timeMatch[4] ? timeMatch[4].toLowerCase() : '';
        
        // Convert to 24-hour format
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        date.setHours(hours, minutes, 0, 0);
    } else if (dateMatch) {
        // Default time to 9am if only date is specified
        date.setHours(9, 0, 0, 0);
    } else {
        return null;
    }
    
    return date.toISOString();
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        
        if (task.completed) {
            celebrateCompletion();
            showNotification('Task completed!', 'fas fa-check-circle');
            
            // Check for achievements
            checkAchievements();
        }
    }
}

// Delete a task
function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
    showNotification('Task deleted', 'fas fa-trash-alt');
}

// Filter tasks
function filterTasks(filter) {
    renderTasks(filter);
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', 
            btn.innerHTML.includes(filter.charAt(0).toUpperCase() + filter.slice(1)));
    });
}

// Clear completed tasks
function clearCompleted() {
    if (!tasks.some(task => task.completed)) {
        showNotification('No completed tasks to clear!', 'fas fa-info-circle');
        return;
    }
    
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks();
    showNotification('Completed tasks cleared!', 'fas fa-broom');
}

// Update task counters
function updateTaskCount() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    taskCount.textContent = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`;
    completedCount.textContent = `${completedTasks} completed`;
}

// Update progress bar
function updateProgress() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}% Complete`;
}

// Check if list is empty
function checkEmptyState() {
    emptyState.style.display = tasks.length === 0 ? 'flex' : 'none';
}

// Show analytics
function showAnalytics() {
    if (tasks.length === 0) {
        showNotification('No tasks to analyze yet!', 'fas fa-info-circle');
        return;
    }
    
    // Completion chart
    const completedCount = tasks.filter(task => task.completed).length;
    const pendingCount = tasks.length - completedCount;
    
    const completionCtx = document.getElementById('completion-chart').getContext('2d');
    new Chart(completionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [completedCount, pendingCount],
                backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--secondary'), 
                                 getComputedStyle(document.documentElement).getPropertyValue('--primary')],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Priority chart
    const priorityCounts = {
        urgent: tasks.filter(task => task.priority === 'urgent').length,
        high: tasks.filter(task => task.priority === 'high').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        low: tasks.filter(task => task.priority === 'low').length
    };
    
    const priorityCtx = document.getElementById('priority-chart').getContext('2d');
    new Chart(priorityCtx, {
        type: 'bar',
        data: {
            labels: ['Urgent', 'High', 'Medium', 'Low'],
            datasets: [{
                data: [priorityCounts.urgent, priorityCounts.high, priorityCounts.medium, priorityCounts.low],
                backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue('--urgent'),
                    getComputedStyle(document.documentElement).getPropertyValue('--high'),
                    getComputedStyle(document.documentElement).getPropertyValue('--medium'),
                    getComputedStyle(document.documentElement).getPropertyValue('--low')
                ]
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Category chart
    const categories = [...new Set(tasks.map(task => task.category))];
    const categoryCounts = {};
    categories.forEach(category => {
        categoryCounts[category] = tasks.filter(task => task.category === category).length;
    });
    
    const categoryCtx = document.getElementById('category-chart').getContext('2d');
    new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: categories.map(category => categoryCounts[category]),
                backgroundColor: categories.map((_, i) => 
                    `hsl(${(i * 360 / categories.length)}, 70%, 60%)`)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Show modal
    analyticsModal.style.display = 'flex';
}

// Close modal
function closeModal() {
    analyticsModal.style.display = 'none';
    
    // Destroy charts to prevent memory leaks
    Chart.getChart('completion-chart')?.destroy();
    Chart.getChart('priority-chart')?.destroy();
    Chart.getChart('category-chart')?.destroy();
}

// Export tasks
function exportTasks() {
    if (tasks.length === 0) {
        showNotification('No tasks to export!', 'fas fa-info-circle');
        return;
    }
    
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-tasks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showNotification('Tasks exported!', 'fas fa-file-export');
}

// Import tasks
function importTasks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const importedTasks = JSON.parse(event.target.result);
                if (Array.isArray(importedTasks)) {
                    tasks = importedTasks;
                    saveTasks();
                    renderTasks();
                    showNotification('Tasks imported successfully!', 'fas fa-file-import');
                } else {
                    showNotification('Invalid file format!', 'fas fa-exclamation-triangle');
                }
            } catch (error) {
                showNotification('Error reading file!', 'fas fa-exclamation-triangle');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Setup voice input
function setupVoiceInput() {
    if (!('webkitSpeechRecognition' in window)) {
        voiceInputBtn.style.display = 'none';
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    voiceInputBtn.addEventListener('click', () => {
        recognition.start();
        voiceInputBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        showNotification('Listening... Speak now!', 'fas fa-microphone');
    });
    
    recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        inputBox.value = transcript;
        voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    recognition.onerror = () => {
        voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    recognition.onend = () => {
        voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };
}

// Setup drag and drop
function setupDragAndDrop() {
    listContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(listContainer, e.clientY);
        const draggable = document.querySelector('.dragging');
        
        if (afterElement == null) {
            listContainer.appendChild(draggable);
        } else {
            listContainer.insertBefore(draggable, afterElement);
        }
    });
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

// Celebrate task completion
function celebrateCompletion() {
    // Haptic feedback
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
    }
    
    // Confetti effect
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.innerHTML = ['🎉', '✨', '🌟', '🎊', '💫', '☀️'][Math.floor(Math.random() * 6)];
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.fontSize = `${Math.random() * 20 + 10}px`;
        confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
        confettiContainer.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

// Check for achievements
function checkAchievements() {
    const completedCount = tasks.filter(task => task.completed).length;
    
    if (completedCount === 1) {
        showNotification('Achievement unlocked: First Task!', 'fas fa-trophy');
    } else if (completedCount === 5) {
        showNotification('Achievement unlocked: Task Master!', 'fas fa-trophy');
    } else if (completedCount === 10) {
        showNotification('Achievement unlocked: Productivity Pro!', 'fas fa-trophy');
    }
}

// Show notification
function showNotification(message, iconClass) {
    notification.innerHTML = `<i class="${iconClass}"></i> ${message}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Check notification permission
function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// Show welcome notification
function showWelcomeNotification() {
    setTimeout(() => {
        showNotification('Welcome to Ultimate To-Do!', 'fas fa-smile');
    }, 1000);
}

// Update motivational elements
function updateMotivationalElements() {
    const quotes = [
        "Progress, not perfection",
        "Small steps every day lead to big results",
        "You're capable of amazing things",
        "Productivity is about consistency",
        "Every task completed is a victory",
        "The secret of getting ahead is getting started"
    ];
    
    const tips = [
        "Break big tasks into smaller steps",
        "Celebrate small wins along the way",
        "Prioritize your most important tasks first",
        "Take breaks to maintain focus",
        "Review your progress at the end of each day",
        "Start with the task you're most likely to procrastinate"
    ];
    
    // Random quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    motivationalQuote.textContent = `"${randomQuote}"`;
    
    // Random tip (only if empty state is visible)
    if (tasks.length === 0) {
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        inspirationTip.textContent = `Tip: ${randomTip}`;
    }
}

// Toggle dark/light theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    themeToggle.innerHTML = newTheme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// Setup event listeners
function setupEventListeners() {
    // Add task on Enter key
    inputBox.addEventListener('keypress', e => {
        if (e.key === 'Enter') addTask();
    });
    
    // Task click handler
    listContainer.addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!li) return;
        
        if (e.target.closest('.delete-btn')) {
            deleteTask(li.dataset.id);
        } else {
            toggleTaskCompletion(li.dataset.id);
        }
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Voice input
    setupVoiceInput();
    
    // Modal close
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', e => {
        if (e.target === analyticsModal) {
            closeModal();
        }
    });
    
    // Update motivational elements every 30 seconds
    setInterval(updateMotivationalElements, 30000);
    
    // Check for overdue tasks every minute
    setInterval(checkOverdueTasks, 60000);
}

// Check for overdue tasks
function checkOverdueTasks() {
    const now = new Date();
    let hasOverdue = false;
    
    tasks.forEach(task => {
        if (!task.completed && task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (dueDate < now) {
                hasOverdue = true;
            }
        }
    });
    
    if (hasOverdue) {
        showNotification('You have overdue tasks!', 'fas fa-exclamation-triangle');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    init();
});