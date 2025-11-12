/**
 * Alert Settings Manager
 * Manages saved searches and notification settings for user dashboard
 */

class AlertSettingsManager {
    constructor() {
        this.searches = [];
        this.alertHistory = [];
        this.init();
    }

    init() {
        console.log('🔔 Initializing Alert Settings Manager...');
        this.bindEvents();
    }

    bindEvents() {
        // Initialize when saved-searches tab is clicked
        document.addEventListener('click', (e) => {
            const tabButton = e.target.closest('[data-page="saved-searches"]');
            if (tabButton) {
                this.loadSavedSearches();
            }
        });
    }

    /**
     * Load saved searches with alert settings from API
     */
    async loadSavedSearches() {
        const listElement = document.getElementById('saved-searches-list');
        if (!listElement) return;

        try {
            console.log('Loading saved searches with alerts...');
            
            const response = await fetch('/api/user/alert-settings');
            const data = await response.json();

            if (data.success) {
                this.searches = data.searches || [];
                console.log(`Loaded ${this.searches.length} saved searches`);
                
                // Update counters
                const totalCount = document.getElementById('saved-searches-total-count');
                if (totalCount) {
                    totalCount.textContent = this.searches.length;
                }

                const activeCount = this.searches.filter(s => s.alert_enabled).length;
                const activeAlertsCount = document.getElementById('active-alerts-count');
                if (activeAlertsCount) {
                    activeAlertsCount.textContent = activeCount;
                }

                // Render searches
                this.renderSavedSearches();
            } else {
                console.error('Failed to load searches:', data.error);
                this.showError('Не удалось загрузить поиски');
            }
        } catch (error) {
            console.error('Error loading saved searches:', error);
            this.showError('Ошибка загрузки данных');
        }
    }

    /**
     * Render saved searches with notification settings UI
     */
    renderSavedSearches() {
        const listElement = document.getElementById('saved-searches-list');
        if (!listElement) return;

        if (this.searches.length === 0) {
            listElement.innerHTML = `
                <div class="text-center text-gray-500 py-12">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-lg font-medium mb-2">Нет сохранённых поисков</p>
                    <p class="text-sm text-gray-400 mb-4">Создавайте поиски с фильтрами и получайте уведомления о новых объектах</p>
                    <button class="bg-[#0088CC] text-white px-6 py-3 rounded-lg hover:bg-[#006699] transition-colors" onclick="window.location.href='/properties'">
                        Создать первый поиск
                    </button>
                </div>
            `;
            return;
        }

        listElement.innerHTML = this.searches.map(search => this.renderSearchCard(search)).join('');
        
        // Bind events for each search card
        this.bindSearchCardEvents();
    }

    /**
     * Render individual search card with notification controls
     */
    renderSearchCard(search) {
        const filters = this.parseFilters(search);
        const alertsCount = search.alerts_sent_count || 0;
        const isAlertEnabled = search.alert_enabled || false;
        const frequency = search.alert_frequency || 'instant';
        const channels = search.alert_channels || ['email'];

        const frequencyLabels = {
            'instant': '⚡ Мгновенно',
            'daily': '📅 Раз в день',
            'weekly': '📆 Раз в неделю'
        };

        return `
            <div class="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-200 hover:shadow-md transition-all" data-search-id="${search.id}">
                <!-- Search Header -->
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3 flex-1">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="text-base font-semibold text-gray-900 truncate">${search.name || 'Сохранённый поиск'}</h4>
                            <p class="text-sm text-gray-600 truncate">${filters}</p>
                        </div>
                    </div>
                    <button class="settings-btn p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex-shrink-0" data-search-id="${search.id}" title="Настройки уведомлений">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>

                <!-- Alert Status Badges -->
                <div class="flex items-center flex-wrap gap-2 mb-4">
                    ${isAlertEnabled ? `
                        <span class="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                            </svg>
                            ${frequencyLabels[frequency] || 'Активно'}
                        </span>
                    ` : `
                        <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"/>
                            </svg>
                            Отключены
                        </span>
                    `}
                    ${alertsCount > 0 ? `
                        <span class="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                            </svg>
                            ${alertsCount} ${this.getDeclension(alertsCount, ['уведомление', 'уведомления', 'уведомлений'])}
                        </span>
                    ` : ''}
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-2">
                    <button class="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors text-sm font-medium apply-search-btn" data-search-id="${search.id}">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                        </svg>
                        Применить
                    </button>
                    <button class="p-2 border border-gray-300 text-gray-600 rounded-lg hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors delete-search-btn" data-search-id="${search.id}" title="Удалить поиск">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Parse search filters into human-readable string
     */
    parseFilters(search) {
        const filters = [];
        const data = search.additional_filters || {};

        if (data.rooms) filters.push(`${data.rooms}-комн.`);
        if (data.priceFrom || data.priceTo) {
            const from = data.priceFrom ? `от ${(data.priceFrom / 1000000).toFixed(1)} млн` : '';
            const to = data.priceTo ? `до ${(data.priceTo / 1000000).toFixed(1)} млн` : '';
            filters.push([from, to].filter(Boolean).join(' '));
        }
        if (data.district) filters.push(data.district);
        if (data.complex_name) filters.push(`ЖК "${data.complex_name}"`);

        return filters.length > 0 ? filters.join(' • ') : 'Все параметры';
    }

    /**
     * Bind events for search card controls
     */
    bindSearchCardEvents() {

        // Apply search buttons
        document.querySelectorAll('.apply-search-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const searchId = e.currentTarget.dataset.searchId;
                this.applySearch(searchId);
            });
        });

        // Delete search buttons
        document.querySelectorAll('.delete-search-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const searchId = e.currentTarget.dataset.searchId;
                this.deleteSavedSearch(searchId);
            });
        });

        // Settings buttons  
        document.querySelectorAll('.settings-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const searchId = e.currentTarget.dataset.searchId;
                this.openSettingsModal(searchId);
            });
        });
    }

    /**
     * Open settings modal for a specific search
     */
    openSettingsModal(searchId) {
        const search = this.searches.find(s => s.id === parseInt(searchId));
        if (!search) return;

        const isAlertEnabled = search.alert_enabled || false;
        const frequency = search.alert_frequency || 'instant';
        const channels = search.alert_channels || ['email'];
        const filters = this.parseFilters(search);

        const modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-gray-900">Настройки уведомлений</h3>
                            <p class="text-sm text-gray-500 mt-1">${search.name || 'Сохранённый поиск'}</p>
                            <p class="text-xs text-gray-400 mt-1">${filters}</p>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors close-modal">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="px-6 py-6 space-y-6">
                    <!-- Enable/Disable Toggle -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-gray-900">Уведомления</p>
                                <p class="text-xs text-gray-500">Получать о новых объектах</p>
                            </div>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer modal-alert-toggle" data-search-id="${searchId}" ${isAlertEnabled ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <!-- Settings (shown when enabled) -->
                    <div class="modal-notification-settings space-y-6 ${isAlertEnabled ? '' : 'hidden'}">
                        <!-- Frequency Selector -->
                        <div>
                            <label class="text-sm font-semibold text-gray-900 block mb-3">Частота уведомлений</label>
                            <div class="grid grid-cols-3 gap-3">
                                <label class="relative cursor-pointer">
                                    <input type="radio" name="frequency-${searchId}" value="instant" class="sr-only peer modal-frequency" data-search-id="${searchId}" ${frequency === 'instant' ? 'checked' : ''}>
                                    <div class="border-2 border-gray-200 rounded-xl p-3 text-center peer-checked:border-purple-600 peer-checked:bg-purple-50 transition-all hover:border-purple-300">
                                        <div class="text-2xl mb-1">⚡</div>
                                        <div class="text-xs font-medium text-gray-900">Мгновенно</div>
                                    </div>
                                </label>
                                <label class="relative cursor-pointer">
                                    <input type="radio" name="frequency-${searchId}" value="daily" class="sr-only peer modal-frequency" data-search-id="${searchId}" ${frequency === 'daily' ? 'checked' : ''}>
                                    <div class="border-2 border-gray-200 rounded-xl p-3 text-center peer-checked:border-purple-600 peer-checked:bg-purple-50 transition-all hover:border-purple-300">
                                        <div class="text-2xl mb-1">📅</div>
                                        <div class="text-xs font-medium text-gray-900">Раз в день</div>
                                    </div>
                                </label>
                                <label class="relative cursor-pointer">
                                    <input type="radio" name="frequency-${searchId}" value="weekly" class="sr-only peer modal-frequency" data-search-id="${searchId}" ${frequency === 'weekly' ? 'checked' : ''}>
                                    <div class="border-2 border-gray-200 rounded-xl p-3 text-center peer-checked:border-purple-600 peer-checked:bg-purple-50 transition-all hover:border-purple-300">
                                        <div class="text-2xl mb-1">📆</div>
                                        <div class="text-xs font-medium text-gray-900">Раз в неделю</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Channel Checkboxes -->
                        <div>
                            <label class="text-sm font-semibold text-gray-900 block mb-3">Способы уведомления</label>
                            <div class="space-y-3">
                                <label class="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" class="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 modal-channel-checkbox" data-search-id="${searchId}" data-channel="email" ${channels.includes('email') ? 'checked' : ''}>
                                    <div class="flex items-center space-x-3 flex-1">
                                        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">✉️</div>
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">Email</div>
                                            <div class="text-xs text-gray-500">На ${search.user?.email || 'вашу почту'}</div>
                                        </div>
                                    </div>
                                </label>
                                <label class="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" class="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 modal-channel-checkbox" data-search-id="${searchId}" data-channel="telegram" ${channels.includes('telegram') ? 'checked' : ''}>
                                    <div class="flex items-center space-x-3 flex-1">
                                        <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-xl">📱</div>
                                        <div>
                                            <div class="text-sm font-medium text-gray-900">Telegram</div>
                                            <div class="text-xs text-gray-500">В Telegram бот</div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Help Info -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div class="flex items-start space-x-3">
                                <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                                </svg>
                                <div class="text-xs text-blue-800">
                                    <p class="font-medium mb-1">Как настроить уведомления?</p>
                                    <p>Email работает автоматически. Для Telegram подключите бот @InBackBot в настройках профиля.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                    <button class="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium close-modal">
                        Готово
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal on background click
        modal.addEventListener('click', () => this.closeSettingsModal());
        
        // Close on close button
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeSettingsModal());
        });

        // Prevent modal content click from closing
        modal.querySelector('.bg-white').addEventListener('click', (e) => e.stopPropagation());

        // Bind modal control events
        this.bindModalEvents(searchId);
    }

    /**
     * Bind events for modal controls
     */
    bindModalEvents(searchId) {
        // Alert toggle
        const toggle = document.querySelector('.modal-alert-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                const settingsDiv = document.querySelector('.modal-notification-settings');
                if (settingsDiv) {
                    if (enabled) {
                        settingsDiv.classList.remove('hidden');
                    } else {
                        settingsDiv.classList.add('hidden');
                    }
                }
                this.updateAlertSettings(searchId, { alert_enabled: enabled });
            });
        }

        // Frequency radios
        document.querySelectorAll('.modal-frequency').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.updateAlertSettings(searchId, { alert_frequency: e.target.value });
                }
            });
        });

        // Channel checkboxes
        document.querySelectorAll('.modal-channel-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.modal-channel-checkbox');
                const channels = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.dataset.channel);
                this.updateAlertSettings(searchId, { alert_channels: channels });
            });
        });
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.remove();
            // Reload searches to reflect updates
            this.loadSavedSearches();
        }
    }

    /**
     * Update alert settings for a specific search
     */
    async updateAlertSettings(searchId, settings) {
        try {
            console.log(`Updating alert settings for search ${searchId}:`, settings);

            const response = await fetch('/api/user/alert-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ search_id: parseInt(searchId), ...settings })
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Alert settings updated successfully');
                this.showSuccess('Настройки обновлены');
                
                // Update local data
                const search = this.searches.find(s => s.id === parseInt(searchId));
                if (search) {
                    Object.assign(search, settings);
                    
                    // Update active alerts counter
                    const activeCount = this.searches.filter(s => s.alert_enabled).length;
                    const activeAlertsCount = document.getElementById('active-alerts-count');
                    if (activeAlertsCount) {
                        activeAlertsCount.textContent = activeCount;
                    }
                }
            } else {
                console.error('Failed to update settings:', data.error);
                this.showError('Не удалось обновить настройки');
            }
        } catch (error) {
            console.error('Error updating alert settings:', error);
            this.showError('Ошибка обновления настроек');
        }
    }

    /**
     * Delete a saved search
     */
    async deleteSavedSearch(searchId) {
        if (!confirm('Удалить этот поиск и все связанные уведомления?')) {
            return;
        }

        try {
            console.log(`Deleting search ${searchId}...`);

            const response = await fetch(`/api/user/saved-search/${searchId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Search deleted successfully');
                this.showSuccess('Поиск удалён');
                
                // Remove from local array
                this.searches = this.searches.filter(s => s.id !== parseInt(searchId));
                
                // Re-render
                this.renderSavedSearches();
            } else {
                console.error('Failed to delete search:', data.error);
                this.showError('Не удалось удалить поиск');
            }
        } catch (error) {
            console.error('Error deleting search:', error);
            this.showError('Ошибка удаления поиска');
        }
    }

    /**
     * Apply a saved search (redirect to properties with filters)
     */
    applySearch(searchId) {
        const search = this.searches.find(s => s.id === parseInt(searchId));
        if (!search) {
            console.error('Search not found:', searchId);
            return;
        }

        const filters = search.additional_filters || {};
        const params = new URLSearchParams();

        // Build query parameters from filters
        if (filters.complex_name) params.append('complex', filters.complex_name);
        if (filters.rooms) params.append('rooms', filters.rooms);
        if (filters.priceFrom) params.append('price_min', filters.priceFrom);
        if (filters.priceTo) params.append('price_max', filters.priceTo);
        if (filters.areaFrom) params.append('area_min', filters.areaFrom);
        if (filters.areaTo) params.append('area_max', filters.areaTo);
        if (filters.district) params.append('district', filters.district);

        const queryString = params.toString();
        const url = queryString ? `/properties?${queryString}` : '/properties';
        
        console.log('Applying search, redirecting to:', url);
        window.location.href = url;
    }

    /**
     * Load alert history from API
     */
    async loadAlertHistory() {
        try {
            console.log('Loading alert history...');
            
            const response = await fetch('/api/user/alert-history?limit=20');
            const data = await response.json();

            if (data.success) {
                this.alertHistory = data.alerts || [];
                console.log(`Loaded ${this.alertHistory.length} alerts`);
                this.renderAlertHistory();
            } else {
                console.error('Failed to load alert history:', data.error);
                this.showError('Не удалось загрузить историю уведомлений');
            }
        } catch (error) {
            console.error('Error loading alert history:', error);
            this.showError('Ошибка загрузки истории');
        }
    }

    /**
     * Render alert history list
     */
    renderAlertHistory() {
        const listElement = document.getElementById('alert-history-list');
        const noHistoryMsg = document.getElementById('no-history-message');
        
        if (!listElement) return;

        if (this.alertHistory.length === 0) {
            listElement.innerHTML = '';
            if (noHistoryMsg) {
                noHistoryMsg.classList.remove('hidden');
            }
            return;
        }

        if (noHistoryMsg) {
            noHistoryMsg.classList.add('hidden');
        }

        listElement.innerHTML = this.alertHistory.map(alert => `
            <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer" onclick="window.location.href='/object/${alert.property_id}'">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h5 class="font-medium text-gray-900 text-sm mb-1">${alert.property_name || 'Новый объект'}</h5>
                        <p class="text-xs text-gray-600 mb-2">${this.formatPrice(alert.property_price)}</p>
                        <div class="flex items-center space-x-3 text-xs text-gray-500">
                            <span>📅 ${this.formatDate(alert.sent_at)}</span>
                            ${alert.delivery_status === 'sent' ? 
                                '<span class="text-green-600">✓ Отправлено</span>' : 
                                '<span class="text-yellow-600">⏳ В очереди</span>'
                            }
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
        `).join('');
    }

    /**
     * Helper: Format price
     */
    formatPrice(price) {
        if (!price) return 'Цена не указана';
        return `${(price / 1000000).toFixed(2)} млн ₽`;
    }

    /**
     * Helper: Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'Недавно';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Helper: Get word declension
     */
    getDeclension(number, forms) {
        const n = Math.abs(number) % 100;
        const n1 = n % 10;
        
        if (n > 10 && n < 20) return forms[2];
        if (n1 > 1 && n1 < 5) return forms[1];
        if (n1 === 1) return forms[0];
        
        return forms[2];
    }

    /**
     * Helper: Get CSRF token
     */
    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    /**
     * Helper: Show success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Helper: Show error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Helper: Show notification
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

/**
 * Toggle alert history accordion
 */
window.toggleAlertHistory = function() {
    const content = document.getElementById('alert-history-content');
    const chevron = document.getElementById('history-chevron');
    
    if (content && chevron) {
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            content.classList.remove('hidden');
            chevron.style.transform = 'rotate(180deg)';
            
            // Load history when opening for the first time
            if (window.alertSettingsManager && window.alertSettingsManager.alertHistory.length === 0) {
                window.alertSettingsManager.loadAlertHistory();
            }
        } else {
            content.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.alertSettingsManager = new AlertSettingsManager();
    });
} else {
    window.alertSettingsManager = new AlertSettingsManager();
}
