(function() {
    'use strict';

    // Получаем параметры из data-атрибутов скрипта
    // В Safari document.currentScript может быть null, используем более надежный способ
    let scriptTag = document.currentScript;
    if (!scriptTag) {
        // Fallback для Safari и других браузеров, где currentScript не работает
        const scripts = document.querySelectorAll('script[data-calendar-id]');
        // Берем последний скрипт с data-calendar-id (самый свежий)
        scriptTag = scripts.length > 0 ? scripts[scripts.length - 1] : null;
    }
    const calendarId = scriptTag?.getAttribute('data-calendar-id') || 'calendar-1';
    const themeName = scriptTag?.getAttribute('data-theme') || 'theme-default';
    const basePath = scriptTag?.getAttribute('data-base-path') || '';

    // Определяем путь к конфигурации и теме
    const configPath = basePath ? `${basePath}/config/${calendarId}.json` : `config/${calendarId}.json`;
    const themePath = basePath ? `${basePath}/themes/${themeName}.css` : `themes/${themeName}.css`;

    // Отслеживание текущего URL для обнаружения навигации
    // Используем pathname + search для более надежного отслеживания (игнорируем hash)
    let currentUrl = window.location.pathname + window.location.search;

    let CONFIG = {
        scheduleDates: [],
        position: 'top-right',
        pulseSpeed: 2000,
        maxEvents: 10
    };

    let escHandler = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDate = null; // null = показать все события, иначе - конкретная дата для фильтрации

    // Загрузка конфигурации
    async function loadConfig() {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            const data = await response.json();
            CONFIG = {
                scheduleDates: data.scheduleDates || [],
                position: data.position || 'top-right',
                pulseSpeed: data.pulseSpeed || 2000,
                maxEvents: data.maxEvents || 10
            };
            return true;
        } catch (error) {
            console.error('Error loading calendar config:', error);
            return false;
        }
    }

    // Загрузка темы
    function loadTheme() {
        const existingTheme = document.getElementById('calendar-widget-theme');
        if (existingTheme) {
            existingTheme.remove();
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = themePath;
        link.id = 'calendar-widget-theme';
        document.head.appendChild(link);
    }

    // Удаление виджета
    function removeWidget() {
        const container = document.getElementById('calendar-widget-container');
        const overlay = document.getElementById('calendar-modal-overlay');
        const theme = document.getElementById('calendar-widget-theme');

        if (container) container.remove();
        if (overlay) overlay.remove();
        if (theme) theme.remove();

        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
    }

    // Проверка изменения URL и удаление/пересоздание виджета при навигации
    function checkUrlChange() {
        const newUrl = window.location.pathname + window.location.search;
        if (newUrl !== currentUrl) {
            const oldUrl = currentUrl;
            currentUrl = newUrl;
            removeWidget();
            // Если вернулись на страницу с виджетом, пересоздаем его
            // Проверяем наличие скрипта с data-calendar-id на странице (более надежный способ)
            const scripts = document.querySelectorAll('script[data-calendar-id]');
            const scriptTag = scripts.length > 0 ? scripts[scripts.length - 1] : null;
            if (scriptTag && document.body) {
                // Небольшая задержка для завершения навигации
                setTimeout(() => {
                    // Проверяем, что виджета нет и мы на той же странице
                    const currentUrlCheck = window.location.pathname + window.location.search;
                    if (!document.getElementById('calendar-widget-container') && 
                        currentUrlCheck === newUrl && 
                        document.querySelector('script[data-calendar-id]')) {
                        loadTheme();
                        createWidget();
                        // Загружаем конфигурацию и обновляем виджет
                        loadConfig().then(success => {
                            if (success) {
                                const overlay = document.getElementById('calendar-modal-overlay');
                                if (overlay) {
                                    updateCalendar();
                                    updateEventsList();
                                }
                            }
                        });
                    }
                }, 150);
            }
        }
    }

    // Перехватываем pushState и replaceState для отслеживания SPA навигации
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(checkUrlChange, 0);
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(checkUrlChange, 0);
    };

    const calendarIconSVG = `
        <svg class="calendar-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
        </svg>
    `;

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    function parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    function getMonthName(month) {
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return months[month];
    }

    function renderCalendar(year, month) {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatDate(today);

        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        let html = '<div class="calendar-grid">';

        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(prevYear, prevMonth, day);
            const dateStr = formatDate(date);
            const event = CONFIG.scheduleDates.find(e => e.date === dateStr);

            let classes = 'calendar-day other-month';
            if (event) classes += ' has-event';
            const style = event ? `border-color: ${event.color}; color: ${event.color};` : '';

            html += `
                <div class="${classes}" style="${style}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    ${event ? `<div class="calendar-event-tooltip" style="white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word !important;">${event.title}</div>` : ''}
                </div>
            `;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDate(date);
            const event = CONFIG.scheduleDates.find(e => e.date === dateStr);
            const isToday = dateStr === todayStr;

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (event) classes += ' has-event';
            const style = event ? `border-color: ${event.color}; color: ${event.color};` : '';

            html += `
                <div class="${classes}" style="${style}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    ${event ? `<div class="calendar-event-tooltip" style="white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word !important;">${event.title}</div>` : ''}
                </div>
            `;
        }

        const totalCells = firstDay + daysInMonth;
        const remainingCells = 42 - totalCells;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;

        for (let day = 1; day <= remainingCells && day <= 14; day++) {
            const date = new Date(nextYear, nextMonth, day);
            const dateStr = formatDate(date);
            const event = CONFIG.scheduleDates.find(e => e.date === dateStr);

            let classes = 'calendar-day other-month';
            if (event) classes += ' has-event';
            const style = event ? `border-color: ${event.color}; color: ${event.color};` : '';

            html += `
                <div class="${classes}" style="${style}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    ${event ? `<div class="calendar-event-tooltip" style="white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: break-word !important;">${event.title}</div>` : ''}
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    function renderEventsList() {
        let filteredEvents = [...CONFIG.scheduleDates];
        let isPastDate = false;
        
        // Фильтруем по выбранной дате, если она указана
        if (selectedDate) {
            filteredEvents = filteredEvents.filter(e => e.date === selectedDate);
            // Проверяем, является ли выбранная дата прошедшей
            const selectedDateObj = parseDate(selectedDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Сравниваем даты напрямую (parseDate уже возвращает дату с временем 00:00:00)
            isPastDate = selectedDateObj.getTime() < today.getTime();
        } else {
            // Показываем только предстоящие события, если дата не выбрана
            filteredEvents = filteredEvents.filter(e => {
                const eventDate = parseDate(e.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate >= today;
            });
            // Ограничиваем количество событий в общем списке
            filteredEvents = filteredEvents.slice(0, CONFIG.maxEvents);
        }

        // Сортируем по дате
        filteredEvents.sort((a, b) => a.date.localeCompare(b.date));

        let html = '<div class="calendar-events-list">';
        
        // Заголовок зависит от того, прошедшая ли дата
        const titleText = isPastDate ? 'Прошедшие события' : 'Предстоящие события';
        html += '<div class="calendar-events-title" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">';
        html += `<span>${titleText}</span>`;
        if (selectedDate) {
            html += '<button id="calendar-show-all-btn" style="background: rgba(212, 175, 55, 0.2); border: 1px solid rgba(212, 175, 55, 0.4); color: #d4af37; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;">Показать все события</button>';
        }
        html += '</div>';

        if (filteredEvents.length === 0) {
            html += '<p style="color: #c9a961; text-align: center; padding: 20px;">Нет событий</p>';
        } else {
            filteredEvents.forEach(event => {
                const date = parseDate(event.date);
                const dateStr = date.toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                html += `
                    <div class="calendar-event-item" style="border-left-color: ${event.color}">
                        <div class="calendar-event-date">${dateStr}</div>
                        <div class="calendar-event-title">${event.title}</div>
                    </div>
                `;
            });
        }

        html += '</div>';
        return html;
    }

    // Обновление списка событий
    function updateEventsList() {
        const modal = document.querySelector('.calendar-modal');
        if (modal) {
            const oldEvents = modal.querySelector('.calendar-events-list');
            if (oldEvents) {
                const eventsHTML = renderEventsList();
                oldEvents.outerHTML = eventsHTML;
                
                // Добавляем обработчик для кнопки "Показать все"
                const showAllBtn = document.getElementById('calendar-show-all-btn');
                if (showAllBtn) {
                    showAllBtn.addEventListener('click', () => {
                        selectedDate = null;
                        updateEventsList();
                    });
                }
            }
        }
    }

    // Обработка клика на дату
    function handleDateClick(dateStr) {
        selectedDate = dateStr;
        updateEventsList();
    }

    // Добавление обработчиков кликов на дни календаря
    function addDateClickListeners() {
        const dayElements = document.querySelectorAll('.calendar-day[data-date]');
        dayElements.forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                const dateStr = dayEl.getAttribute('data-date');
                if (dateStr) {
                    handleDateClick(dateStr);
                }
            });
        });
    }

    // Добавление обработчиков для tooltips с правильным позиционированием
    function addTooltipHandlers() {
        const dayElements = document.querySelectorAll('.calendar-day.has-event');
        dayElements.forEach(dayEl => {
            const tooltip = dayEl.querySelector('.calendar-event-tooltip');
            if (tooltip) {
                // Не клонируем элемент - это удаляет обработчики кликов
                // Просто добавляем обработчик mouseenter для позиционирования tooltip
                dayEl.addEventListener('mouseenter', (e) => {
                    const tooltipEl = dayEl.querySelector('.calendar-event-tooltip');
                    if (tooltipEl) {
                        // Применяем стили для переноса строк
                        tooltipEl.style.whiteSpace = 'normal';
                        tooltipEl.style.wordWrap = 'break-word';
                        tooltipEl.style.overflowWrap = 'break-word';
                        tooltipEl.style.wordBreak = 'break-word';
                        
                        // Небольшая задержка для правильного расчета размеров
                        setTimeout(() => {
                            // Проверяем, не выходит ли tooltip за правый край
                            const rect = tooltipEl.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            if (rect.right > viewportWidth - 10) {
                                // Позиционируем слева от элемента
                                tooltipEl.style.left = 'auto';
                                tooltipEl.style.right = '0';
                                tooltipEl.style.transform = 'none';
                            } else if (rect.left < 10) {
                                // Позиционируем справа от элемента
                                tooltipEl.style.left = '0';
                                tooltipEl.style.right = 'auto';
                                tooltipEl.style.transform = 'none';
                            } else {
                                // Центрируем
                                tooltipEl.style.left = '50%';
                                tooltipEl.style.right = 'auto';
                                tooltipEl.style.transform = 'translateX(-50%)';
                            }
                        }, 10);
                    }
                });
            }
        });
    }

    function changeMonth(direction) {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
        } else if (direction === 'next') {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
        }
        // Сбрасываем выбранную дату при смене месяца
        selectedDate = null;
        updateCalendar();
        updateEventsList();
    }

    function updateCalendar() {
        const modal = document.querySelector('.calendar-modal');
        if (modal) {
            const calendarHTML = renderCalendar(currentYear, currentMonth);
            const monthYear = getMonthName(currentMonth) + ' ' + currentYear;

            const navHTML = `
                <div class="calendar-navigation">
                    <button class="calendar-nav-button" id="calendar-prev-btn">‹</button>
                    <div class="calendar-month-year">${monthYear}</div>
                    <button class="calendar-nav-button" id="calendar-next-btn">›</button>
                </div>
            `;

            const header = modal.querySelector('.calendar-modal-header');
            const oldNav = modal.querySelector('.calendar-navigation');
            const oldCalendar = modal.querySelector('.calendar-grid');

            if (oldNav) oldNav.remove();
            if (oldCalendar) oldCalendar.remove();

            header.insertAdjacentHTML('afterend', navHTML);
            modal.querySelector('.calendar-navigation').insertAdjacentHTML('afterend', calendarHTML);

            document.getElementById('calendar-prev-btn').addEventListener('click', () => changeMonth('prev'));
            document.getElementById('calendar-next-btn').addEventListener('click', () => changeMonth('next'));
            
            // Добавляем обработчики для tooltips (сначала, чтобы клонирование не удалило обработчики кликов)
            addTooltipHandlers();
            
            // Добавляем обработчики кликов на дни (после tooltips, чтобы добавить к клонированным элементам)
            addDateClickListeners();
        }
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'calendar-modal-overlay';
        overlay.id = 'calendar-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'calendar-modal';

        const now = new Date();
        currentMonth = now.getMonth();
        currentYear = now.getFullYear();
        const calendarHTML = renderCalendar(currentYear, currentMonth);
        const eventsHTML = renderEventsList();
        const monthYear = getMonthName(currentMonth) + ' ' + currentYear;

        modal.innerHTML = `
            <div class="calendar-modal-header">
                <h2 class="calendar-modal-title">Расписание курса</h2>
                <button class="calendar-modal-close" id="calendar-close-btn">&times;</button>
            </div>
            <div class="calendar-navigation">
                <button class="calendar-nav-button" id="calendar-prev-btn">‹</button>
                <div class="calendar-month-year">${monthYear}</div>
                <button class="calendar-nav-button" id="calendar-next-btn">›</button>
            </div>
            ${calendarHTML}
            ${eventsHTML}
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        document.getElementById('calendar-close-btn').addEventListener('click', closeModal);
        document.getElementById('calendar-prev-btn').addEventListener('click', () => changeMonth('prev'));
        document.getElementById('calendar-next-btn').addEventListener('click', () => changeMonth('next'));
        
        // Добавляем обработчики кликов на дни
        addDateClickListeners();
        
        // Добавляем обработчики для tooltips
        addTooltipHandlers();
        
        // Добавляем обработчик для кнопки "Показать все"
        const showAllBtn = document.getElementById('calendar-show-all-btn');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                selectedDate = null;
                updateEventsList();
            });
        }

        if (!escHandler) {
            escHandler = (e) => {
                const overlay = document.getElementById('calendar-modal-overlay');
                if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
                    closeModal();
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    }

    function openModal() {
        const overlay = document.getElementById('calendar-modal-overlay');
        if (overlay) {
            const now = new Date();
            currentMonth = now.getMonth();
            currentYear = now.getFullYear();

            const calendarHTML = renderCalendar(currentYear, currentMonth);
            const eventsHTML = renderEventsList();
            const monthYear = getMonthName(currentMonth) + ' ' + currentYear;

            const modal = overlay.querySelector('.calendar-modal');
            modal.innerHTML = `
                <div class="calendar-modal-header">
                    <h2 class="calendar-modal-title">Расписание курса</h2>
                    <button class="calendar-modal-close" id="calendar-close-btn">&times;</button>
                </div>
                <div class="calendar-navigation">
                    <button class="calendar-nav-button" id="calendar-prev-btn">‹</button>
                    <div class="calendar-month-year">${monthYear}</div>
                    <button class="calendar-nav-button" id="calendar-next-btn">›</button>
                </div>
                ${calendarHTML}
                ${eventsHTML}
            `;

            document.getElementById('calendar-close-btn').addEventListener('click', closeModal);
            document.getElementById('calendar-prev-btn').addEventListener('click', () => changeMonth('prev'));
            document.getElementById('calendar-next-btn').addEventListener('click', () => changeMonth('next'));
            
            // Добавляем обработчики для tooltips (сначала, чтобы клонирование не удалило обработчики кликов)
            addTooltipHandlers();
            
            // Добавляем обработчики кликов на дни (после tooltips, чтобы добавить к клонированным элементам)
            addDateClickListeners();
            
            // Добавляем обработчик для кнопки "Показать все"
            const showAllBtn = document.getElementById('calendar-show-all-btn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => {
                    selectedDate = null;
                    updateEventsList();
                });
            }

            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        const overlay = document.getElementById('calendar-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            // Сбрасываем выбранную дату при закрытии
            selectedDate = null;
        }
    }

    function createWidget() {
        // Проверяем, не создан ли уже виджет
        if (document.getElementById('calendar-widget-container')) {
            return;
        }

        // Создаём кнопку виджета
        const container = document.createElement('div');
        container.className = `calendar-widget-container ${CONFIG.position === 'top-left' ? 'top-left' : ''}`;
        container.id = 'calendar-widget-container';

        const button = document.createElement('div');
        button.className = 'calendar-widget-button';
        button.innerHTML = calendarIconSVG;
        button.addEventListener('click', openModal);

        container.appendChild(button);
        document.body.appendChild(container);

        // Создаём модальное окно
        createModal();

        // Обновляем отслеживаемый URL после создания виджета
        currentUrl = window.location.pathname + window.location.search;
    }

    // Инициализация
    function init() {
        function waitForBody() {
            if (!document.body) {
                setTimeout(waitForBody, 50);
                return;
            }

            // Отслеживаем навигацию назад/вперед
            window.addEventListener('popstate', checkUrlChange);

            // Загружаем тему
            loadTheme();

            // Создаем виджет сразу (без задержки на загрузку конфигурации)
            createWidget();

            // Проверяем изменения URL каждые 200ms (после создания виджета, чтобы не удалить его сразу)
            // Также проверяем, не нужно ли пересоздать виджет при возврате на страницу
            let urlCheckInterval = setInterval(() => {
                checkUrlChange();
                // Дополнительная проверка: если виджета нет, но скрипт есть - создаем виджет
                const scriptTag = document.querySelector('script[data-calendar-id]');
                if (!document.getElementById('calendar-widget-container') && 
                    scriptTag && 
                    document.body &&
                    document.body.contains(scriptTag)) {
                    // Останавливаем интервал перед созданием виджета
                    clearInterval(urlCheckInterval);
                    loadTheme();
                    createWidget();
                    loadConfig().then(success => {
                        if (success) {
                            const overlay = document.getElementById('calendar-modal-overlay');
                            if (overlay) {
                                updateCalendar();
                                updateEventsList();
                            }
                        }
                    });
                    // Перезапускаем интервал после создания виджета
                    urlCheckInterval = setInterval(() => {
                        checkUrlChange();
                        if (!document.getElementById('calendar-widget-container') && 
                            document.querySelector('script[data-calendar-id]') && 
                            document.body) {
                            loadTheme();
                            createWidget();
                            loadConfig().then(success => {
                                if (success) {
                                    const overlay = document.getElementById('calendar-modal-overlay');
                                    if (overlay) {
                                        updateCalendar();
                                        updateEventsList();
                                    }
                                }
                            });
                        }
                    }, 200);
                }
            }, 200);

            // Загружаем конфигурацию асинхронно и обновляем виджет
            loadConfig().then(success => {
                if (success) {
                    // Обновляем модальное окно с новой конфигурацией
                    const overlay = document.getElementById('calendar-modal-overlay');
                    if (overlay) {
                        const modal = overlay.querySelector('.calendar-modal');
                        if (modal) {
                            const now = new Date();
                            currentMonth = now.getMonth();
                            currentYear = now.getFullYear();
                            const calendarHTML = renderCalendar(currentYear, currentMonth);
                            const eventsHTML = renderEventsList();
                            const monthYear = getMonthName(currentMonth) + ' ' + currentYear;

                            const oldNav = modal.querySelector('.calendar-navigation');
                            const oldCalendar = modal.querySelector('.calendar-grid');
                            const oldEvents = modal.querySelector('.calendar-events-list');

                            if (oldNav) oldNav.remove();
                            if (oldCalendar) oldCalendar.remove();
                            if (oldEvents) oldEvents.remove();

                            const header = modal.querySelector('.calendar-modal-header');
                            header.insertAdjacentHTML('afterend', `
                                <div class="calendar-navigation">
                                    <button class="calendar-nav-button" id="calendar-prev-btn">‹</button>
                                    <div class="calendar-month-year">${monthYear}</div>
                                    <button class="calendar-nav-button" id="calendar-next-btn">›</button>
                                </div>
                                ${calendarHTML}
                                ${eventsHTML}
                            `);

                            document.getElementById('calendar-prev-btn').addEventListener('click', () => changeMonth('prev'));
                            document.getElementById('calendar-next-btn').addEventListener('click', () => changeMonth('next'));
                            addDateClickListeners();
                            addTooltipHandlers();
                            
                            const showAllBtn = document.getElementById('calendar-show-all-btn');
                            if (showAllBtn) {
                                showAllBtn.addEventListener('click', () => {
                                    selectedDate = null;
                                    updateEventsList();
                                });
                            }
                        }
                    }
                } else {
                    console.warn('Using default config due to load error');
                }
            });
        }

        waitForBody();
    }

    init();
})();
