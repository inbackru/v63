// ✅ ФИЛЬТРЫ ДЛЯ СТРАНИЦЫ СВОЙСТВ - AJAX MODE (как Домклик/Циан)
console.log('🔥 property-filters.js загружается - AJAX MODE...');

// ======================
// ABORT CONTROLLER FOR RACE CONDITION PREVENTION
// ======================

// ✅ КРИТИЧНО: AbortController для предотвращения race conditions
let currentFilterAbortController = null;

// ======================
// LOADING INDICATOR & SCROLL FUNCTIONS
// ======================

// Функция для показа индикатора загрузки
function showLoadingIndicator() {
    const listContainer = document.getElementById('properties-list');
    if (listContainer) {
        listContainer.style.opacity = '0.5';
        listContainer.style.pointerEvents = 'none';
    }
    
    // Добавляем спиннер если его еще нет
    if (!document.getElementById('loading-spinner')) {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
        spinner.innerHTML = `
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        `;
        document.body.appendChild(spinner);
    }
}

// Функция для скрытия индикатора загрузки
function hideLoadingIndicator() {
    const listContainer = document.getElementById('properties-list');
    if (listContainer) {
        listContainer.style.opacity = '1';
        listContainer.style.pointerEvents = 'auto';
    }
    
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Функция для скролла к списку объектов
function scrollToPropertiesList() {
    const listContainer = document.getElementById('properties-list');
    if (listContainer) {
        const offset = 100; // Отступ сверху
        const top = listContainer.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }
}

// ======================
// DEBOUNCE FUNCTION
// ======================

// Debounce для текстовых полей (300ms как в Домклик/Циан)
let debounceTimeout = null;
function debounceApplyFilters(delay = 300) {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
        window.applyFilters();
    }, delay);
}

// ======================
// LIVE COUNT UPDATE FUNCTION
// ======================

// Debounce для обновления счетчика (500ms - быстрее чем full filter apply)
let countDebounceTimeout = null;
function updateFilteredCount() {
    // Очищаем предыдущий таймаут
    if (countDebounceTimeout) {
        clearTimeout(countDebounceTimeout);
    }
    
    // Устанавливаем новый таймаут
    countDebounceTimeout = setTimeout(() => {
        // Собираем те же параметры фильтров что и в applyFilters
        const params = new URLSearchParams();
        
        // ===== TEXT SEARCH =====
        // Читаем из обоих полей (мобильного и десктопного) - синхронизированы
        const mobileSearch = document.getElementById('property-search');
        const desktopSearch = document.getElementById('property-search-desktop');
        const searchValue = (mobileSearch && mobileSearch.value.trim()) || (desktopSearch && desktopSearch.value.trim());
        
        if (searchValue) {
            params.set('q', searchValue);
        }
        
        // ===== BASIC FILTERS =====
        
        // Room filter
        const checkedRooms = Array.from(document.querySelectorAll('input[data-filter-type="rooms"]:checked')).map(cb => cb.value);
        if (checkedRooms.length > 0) {
            params.set('rooms', checkedRooms.join(','));
        }
        
        // Price filter
        const priceFromEl = document.getElementById('priceFrom') || document.getElementById('price-from');
        const priceToEl = document.getElementById('priceTo') || document.getElementById('price-to');
        const priceFromModalEl = document.getElementById('priceFromModal');
        const priceToModalEl = document.getElementById('priceToModal');
        
        if (priceFromEl && priceFromEl.value) params.set('price_min', priceFromEl.value);
        if (priceToEl && priceToEl.value) params.set('price_max', priceToEl.value);
        if (priceFromModalEl && priceFromModalEl.value) params.set('price_min', priceFromModalEl.value);
        if (priceToModalEl && priceToModalEl.value) params.set('price_max', priceToModalEl.value);
        
        // ===== ADVANCED FILTERS =====
        
        // Developers
        const developers = Array.from(document.querySelectorAll('input[data-filter-type="developer"]:checked'))
            .map(cb => cb.value);
        if (developers.length > 0) {
            params.set('developers', developers.join(','));
        }
        
        // Districts
        const districts = Array.from(document.querySelectorAll('input[data-filter-type="district"]:checked'))
            .map(cb => cb.value);
        if (districts.length > 0) {
            params.set('districts', districts.join(','));
        }
        
        // Completion dates
        const completion = Array.from(document.querySelectorAll('input[data-filter-type="completion"]:checked'))
            .map(cb => cb.value);
        if (completion.length > 0) {
            params.set('completion', completion.join(','));
        }
        
        // Object class
        const objectClass = Array.from(document.querySelectorAll('input[data-filter-type="object_class"]:checked'))
            .map(cb => cb.value);
        if (objectClass.length > 0) {
            params.set('object_class', objectClass.join(','));
        }
        
        // Renovation
        const renovation = Array.from(document.querySelectorAll('input[data-filter-type="renovation"]:checked'))
            .map(cb => cb.value);
        if (renovation.length > 0) {
            params.set('renovation', renovation.join(','));
        }
        
        // Floor options
        const floorOptions = Array.from(document.querySelectorAll('input[data-filter-type="floor_options"]:checked'))
            .map(cb => cb.value);
        if (floorOptions.length > 0) {
            params.set('floor_options', floorOptions.join(','));
        }
        
        // Features
        const features = Array.from(document.querySelectorAll('input[data-filter-type="features"]:checked'))
            .map(cb => cb.value);
        if (features.length > 0) {
            params.set('features', features.join(','));
        }
        
        // Building released
        const buildingReleased = Array.from(document.querySelectorAll('input[data-filter-type="building_released"]:checked'))
            .map(cb => cb.value);
        if (buildingReleased.length > 0) {
            params.set('building_released', buildingReleased.join(','));
        }
        
        // Area range
        const areaFromEl = document.getElementById('areaFrom');
        const areaToEl = document.getElementById('areaTo');
        if (areaFromEl && areaFromEl.value) params.set('area_min', areaFromEl.value);
        if (areaToEl && areaToEl.value) params.set('area_max', areaToEl.value);
        
        // Floor range
        const floorFromEl = document.getElementById('floorFrom');
        const floorToEl = document.getElementById('floorTo');
        if (floorFromEl && floorFromEl.value) params.set('floor_min', floorFromEl.value);
        if (floorToEl && floorToEl.value) params.set('floor_max', floorToEl.value);
        
        // Building floors range
        const maxFloorFromEl = document.getElementById('maxFloorFrom');
        const maxFloorToEl = document.getElementById('maxFloorTo');
        if (maxFloorFromEl && maxFloorFromEl.value) params.set('building_floors_min', maxFloorFromEl.value);
        if (maxFloorToEl && maxFloorToEl.value) params.set('building_floors_max', maxFloorToEl.value);
        
        // Build year range
        const buildYearFromEl = document.getElementById('buildYearFrom');
        const buildYearToEl = document.getElementById('buildYearTo');
        if (buildYearFromEl && buildYearFromEl.value) params.set('build_year_min', buildYearFromEl.value);
        if (buildYearToEl && buildYearToEl.value) params.set('build_year_max', buildYearToEl.value);
        
        // Вызываем API для подсчета
        const apiUrl = '/api/properties/count?' + params.toString();
        console.log('🔢 Fetching count:', apiUrl);
        
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.success && typeof data.count !== 'undefined') {
                    const count = data.count;
                    console.log('✅ Count received:', count);
                    
                    // Обновляем все счетчики
                    const counters = [
                        'filteredResultsCount',
                        'roomsFilteredCount',
                        'priceFilteredCount',
                        'developerFilteredCount'
                    ];
                    
                    counters.forEach(counterId => {
                        const counter = document.getElementById(counterId);
                        if (counter) {
                            counter.textContent = count;
                        }
                    });
                    
                    // Сохраняем глобально для других функций
                    window.currentFilteredCount = count;
                } else {
                    console.error('❌ Count API error:', data);
                }
            })
            .catch(error => {
                console.error('❌ Count fetch error:', error);
            });
    }, 500);
}

// Экспортируем функцию глобально
window.updateFilteredCount = updateFilteredCount;

// ✅ Initialize advanced filters button ("Еще" button)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Initializing advanced filters button...');
    
    const advancedButton = document.getElementById('advancedFiltersToggle');
    const advancedPanel = document.getElementById('advancedFiltersPanel');
    const advancedArrow = document.getElementById('advancedFiltersArrow');
    
    if (advancedButton && advancedPanel) {
        advancedButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close all dropdowns first
            document.querySelectorAll('.dropdown-menu.open').forEach(menu => {
                menu.classList.remove('open');
            });
            
            // Toggle advanced panel
            const isHidden = advancedPanel.classList.contains('hidden');
            advancedPanel.classList.toggle('hidden');
            
            // ✅ КРИТИЧНО: Обновляем счетчик сразу при открытии модального окна
            if (isHidden && typeof window.updateFilteredCount === 'function') {
                console.log('🔢 Updating count on modal open...');
                window.updateFilteredCount();
            }
            
            // На мобайле добавляем полноэкранный режим
            const isMobile = window.innerWidth <= 640;
            if (isMobile) {
                if (isHidden) {
                    // Открываем - добавляем класс
                    advancedPanel.classList.add('mobile-fullscreen');
                    document.body.style.overflow = 'hidden'; // Блокируем скролл body
                } else {
                    // Закрываем - убираем класс
                    advancedPanel.classList.remove('mobile-fullscreen');
                    document.body.style.overflow = ''; // Восстанавливаем скролл
                }
            }
            
            // Rotate arrow
            if (advancedArrow) {
                if (advancedPanel.classList.contains('hidden')) {
                    advancedArrow.style.transform = 'rotate(0deg)';
                } else {
                    advancedArrow.style.transform = 'rotate(180deg)';
                }
            }
            
            console.log('✅ Advanced filters panel toggled:', !advancedPanel.classList.contains('hidden'), 'Mobile fullscreen:', isMobile);
        });
        console.log('✅ "Еще" button handler registered successfully');
        
        // Обработчик кнопки закрытия расширенных фильтров
        const closeButton = document.getElementById('closeAdvancedFilters');
        if (closeButton && advancedPanel) {
            closeButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Закрываем панель
                advancedPanel.classList.add('hidden');
                
                // Убираем полноэкранный режим на мобайле
                const isMobile = window.innerWidth <= 640;
                if (isMobile) {
                    advancedPanel.classList.remove('mobile-fullscreen');
                    document.body.style.overflow = ''; // Восстанавливаем скролл
                }
                
                // Rotate arrow back
                if (advancedArrow) {
                    advancedArrow.style.transform = 'rotate(0deg)';
                }
                
                console.log('✅ Advanced filters closed via close button');
            });
            console.log('✅ Close button handler registered');
        }
    } else {
        console.error('❌ Advanced filter elements not found:', {advancedButton, advancedPanel, advancedArrow});
    }
    
    // Display active filters on page load (with delay to ensure DOM is ready)
    console.log('🏷️ Initializing active filters display...');
    setTimeout(() => {
        if (typeof window.displayActiveFilters === 'function') {
            window.displayActiveFilters();
            console.log('✅ Active filters displayed on page load');
        } else {
            console.log('⏳ displayActiveFilters function not yet available, will be loaded later');
        }
    }, 100);
});

// Handle room filter changes - AJAX MODE
window.handleRoomFilterChange = function() {
    const checkedRooms = Array.from(document.querySelectorAll('input[data-filter-type="rooms"]:checked')).map(cb => cb.value);
    console.log('Room filters changed:', checkedRooms);
    
    // Map numeric values to display labels
    const roomLabels = {
        '0': 'Студия',
        '1': '1-комн',
        '2': '2-комн',
        '3': '3-комн',
        '4': '4-комн'
    };
    
    // Update button text
    const buttonText = document.getElementById('roomsFilterText');
    if (buttonText) {
        if (checkedRooms.length === 0) {
            buttonText.textContent = 'Комнат';
        } else if (checkedRooms.length === 1) {
            buttonText.textContent = roomLabels[checkedRooms[0]] || checkedRooms[0];
        } else {
            buttonText.textContent = `${checkedRooms.length} типов`;
        }
    }
    
    // ✅ КРИТИЧНО: Обновляем счетчик объявлений при изменении фильтра
    if (typeof window.updateFilteredCount === 'function') {
        window.updateFilteredCount();
    }
    
    // НЕ применяем полные фильтры автоматически - только обновляем счетчик
    // Пользователь должен нажать "Показать X объявлений" для применения
    // window.applyFilters(); // ❌ УБРАНО - применяем только при нажатии кнопки
};

// Apply Filters - AJAX Mode (как Домклик/Циан)
window.applyFilters = function() {
    console.log('🚀 applyFilters() CALLED - AJAX MODE');
    
    // Показываем loading indicator
    showLoadingIndicator();
    
    // Собираем параметры фильтров
    const params = new URLSearchParams();
    
    // ===== TEXT SEARCH =====
    
    // Search query (from both mobile and desktop inputs - they are synchronized)
    const mobileSearch = document.getElementById('property-search');
    const desktopSearch = document.getElementById('property-search-desktop');
    const searchValue = (mobileSearch && mobileSearch.value.trim()) || (desktopSearch && desktopSearch.value.trim());
    
    if (searchValue) {
        params.set('q', searchValue);
        console.log('🔍 Search query:', searchValue);
    }
    
    // ===== BASIC FILTERS =====
    
    // Room filter (from checkboxes with data-filter-type="rooms")
    const checkedRooms = Array.from(document.querySelectorAll('input[data-filter-type="rooms"]:checked')).map(cb => cb.value);
    if (checkedRooms.length > 0) {
        params.set('rooms', checkedRooms.join(','));
        console.log('📦 Rooms collected from checkboxes:', checkedRooms);
    }
    
    // Price filter (values already in millions, no conversion needed)
    const priceFromEl = document.getElementById('priceFrom') || document.getElementById('price-from');
    const priceToEl = document.getElementById('priceTo') || document.getElementById('price-to');
    if (priceFromEl && priceFromEl.value) params.set('price_min', priceFromEl.value);
    if (priceToEl && priceToEl.value) params.set('price_max', priceToEl.value);
    
    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && sortSelect.value) params.set('sort', sortSelect.value);
    
    // ===== ADVANCED FILTERS =====
    
    // Developers (checkboxes with data-filter-type="developer")
    const developers = Array.from(document.querySelectorAll('input[data-filter-type="developer"]:checked'))
        .map(cb => cb.value);
    if (developers.length > 0) {
        params.set('developers', developers.join(','));
    }
    
    // Districts (checkboxes with data-filter-type="district")
    const districts = Array.from(document.querySelectorAll('input[data-filter-type="district"]:checked'))
        .map(cb => cb.value);
    if (districts.length > 0) {
        params.set('districts', districts.join(','));
    }
    
    // Completion dates (checkboxes with data-filter-type="completion")
    const completion = Array.from(document.querySelectorAll('input[data-filter-type="completion"]:checked'))
        .map(cb => cb.value);
    if (completion.length > 0) {
        params.set('completion', completion.join(','));
    }
    
    // Object/Property class (checkboxes with data-filter-type="object_class")
    const objectClass = Array.from(document.querySelectorAll('input[data-filter-type="object_class"]:checked'))
        .map(cb => cb.value);
    if (objectClass.length > 0) {
        params.set('object_class', objectClass.join(','));
    }
    
    // Renovation (checkboxes with data-filter-type="renovation")
    const renovation = Array.from(document.querySelectorAll('input[data-filter-type="renovation"]:checked'))
        .map(cb => cb.value);
    if (renovation.length > 0) {
        params.set('renovation', renovation.join(','));
    }
    
    // Floor options (checkboxes with data-filter-type="floor_options")
    const floorOptions = Array.from(document.querySelectorAll('input[data-filter-type="floor_options"]:checked'))
        .map(cb => cb.value);
    if (floorOptions.length > 0) {
        params.set('floor_options', floorOptions.join(','));
    }
    
    // Features (checkboxes with data-filter-type="features")
    const features = Array.from(document.querySelectorAll('input[data-filter-type="features"]:checked'))
        .map(cb => cb.value);
    if (features.length > 0) {
        params.set('features', features.join(','));
    }
    
    // Building released (checkboxes with data-filter-type="building_released")
    const buildingReleased = Array.from(document.querySelectorAll('input[data-filter-type="building_released"]:checked'))
        .map(cb => cb.value);
    if (buildingReleased.length > 0) {
        params.set('building_released', buildingReleased.join(','));
    }
    
    // Area range (from areaFrom and areaTo inputs)
    const areaFromEl = document.getElementById('areaFrom');
    const areaToEl = document.getElementById('areaTo');
    if (areaFromEl && areaFromEl.value) params.set('area_min', areaFromEl.value);
    if (areaToEl && areaToEl.value) params.set('area_max', areaToEl.value);
    
    // Floor range (from floorFrom and floorTo inputs)
    const floorFromEl = document.getElementById('floorFrom');
    const floorToEl = document.getElementById('floorTo');
    if (floorFromEl && floorFromEl.value) params.set('floor_min', floorFromEl.value);
    if (floorToEl && floorToEl.value) params.set('floor_max', floorToEl.value);
    
    // Building floors range (from maxFloorFrom and maxFloorTo inputs)
    const maxFloorFromEl = document.getElementById('maxFloorFrom');
    const maxFloorToEl = document.getElementById('maxFloorTo');
    if (maxFloorFromEl && maxFloorFromEl.value) params.set('building_floors_min', maxFloorFromEl.value);
    if (maxFloorToEl && maxFloorToEl.value) params.set('building_floors_max', maxFloorToEl.value);
    
    // Build year range (from buildYearFrom and buildYearTo inputs)
    const buildYearFromEl = document.getElementById('buildYearFrom');
    const buildYearToEl = document.getElementById('buildYearTo');
    if (buildYearFromEl && buildYearFromEl.value) params.set('build_year_min', buildYearFromEl.value);
    if (buildYearToEl && buildYearToEl.value) params.set('build_year_max', buildYearToEl.value);
    
    // Сбрасываем на первую страницу при изменении фильтров
    params.set('page', '1');
    
    // ✅ КРИТИЧНО: Отменяем предыдущий запрос если он еще выполняется
    if (currentFilterAbortController) {
        currentFilterAbortController.abort();
        console.log('🚫 Previous filter request aborted');
    }
    currentFilterAbortController = new AbortController();
    
    // ✅ ИСПРАВЛЕНИЕ: Разделяем параметры для fetch и History API
    // Для запроса используем с cache-busting
    const fetchParams = new URLSearchParams(params);
    fetchParams.set('v', Date.now());
    
    const apiUrl = '/api/properties/list?' + fetchParams.toString();
    console.log('📡 AJAX Fetching:', apiUrl);
    
    // AJAX запрос с AbortController
    fetch(apiUrl, { signal: currentFilterAbortController.signal })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ API Response:', data);
            
            if (data.success && data.properties) {
                // Обновляем список объектов
                if (typeof window.updatePropertiesList === 'function') {
                    window.updatePropertiesList(data.properties);
                }
                
                // Обновляем пагинацию
                if (typeof window.updatePagination === 'function') {
                    window.updatePagination(data.pagination);
                }
                
                // ✅ КРИТИЧНО: Сбрасываем infinite scroll ДО применения view mode
                if (window.infiniteScrollManager && data.pagination) {
                    window.infiniteScrollManager.reset(data.pagination.page, data.pagination.has_next);
                    console.log('♾️ Infinite scroll reset after filtering to page', data.pagination.page);
                }
                
                // Применяем текущий режим отображения после AJAX обновления
                if (typeof window.currentViewMode !== 'undefined' && window.currentViewMode) {
                    if (window.currentViewMode === 'grid' && typeof window.switchToGridView === 'function') {
                        console.log('🔄 Applying GRID view after AJAX filter');
                        window.switchToGridView();
                    } else if (typeof window.switchToListView === 'function') {
                        console.log('🔄 Applying LIST view after AJAX filter');
                        window.switchToListView();
                    }
                } else {
                    // Default to list view if currentViewMode is not set
                    if (typeof window.switchToListView === 'function') {
                        console.log('🔄 Applying default LIST view after AJAX filter');
                        window.switchToListView();
                    }
                }
                
                // ✅ ИСПРАВЛЕНИЕ: Обновляем URL БЕЗ cache-busting параметра
                // params уже не содержит 'v', так как мы использовали fetchParams для запроса
                const newUrl = window.location.pathname + '?' + params.toString();
                window.history.pushState({}, '', newUrl);
                
                // Обновляем отображение активных фильтров
                if (typeof window.displayActiveFilters === 'function') {
                    setTimeout(() => window.displayActiveFilters(), 50);
                }
                
                // Скроллим наверх списка
                scrollToPropertiesList();
                
                console.log(`✅ Filtered ${data.properties.length} properties, total: ${data.pagination.total}`);
            } else {
                console.error('❌ API returned error:', data);
                alert('Ошибка при фильтрации. Пожалуйста, попробуйте еще раз.');
            }
            
            hideLoadingIndicator();
        })
        .catch(error => {
            // ✅ КРИТИЧНО: Игнорируем AbortError - это нормально при быстрой смене фильтров
            if (error.name === 'AbortError') {
                console.log('⚠️ Filter request aborted (user changed filters)');
                hideLoadingIndicator();
                return;
            }
            console.error('❌ Fetch error:', error);
            alert('Ошибка загрузки данных. Пожалуйста, перезагрузите страницу.');
            hideLoadingIndicator();
        })
        .finally(() => {
            // ✅ КРИТИЧНО: Очищаем контроллер после завершения запроса
            currentFilterAbortController = null;
        });
};

// Apply price filter - AJAX VERSION (для кнопки "Применить" в дропдауне цены)
window.applyPriceFilter = function() {
    const priceFrom = document.getElementById('priceFrom').value;
    const priceTo = document.getElementById('priceTo').value;
    
    console.log('💰 Price filter applied:', priceFrom, 'to', priceTo);
    
    // Update button text
    const buttonText = document.getElementById('priceFilterText');
    if (buttonText) {
        if (priceFrom || priceTo) {
            let text = 'Цена ';
            if (priceFrom) text += `от ${priceFrom}млн `;
            if (priceTo) text += `до ${priceTo}млн`;
            buttonText.textContent = text.trim();
        } else {
            buttonText.textContent = 'Цена';
        }
    }
    
    // Close dropdown
    const dropdown = document.getElementById('priceDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
    
    // Apply all filters via AJAX (мгновенная фильтрация)
    window.applyFilters();
};

// Update advanced filters counter (ОБНОВЛЯЕТ ВСЕ БЕЙДЖИ: desktop, mobile и на карте)
window.updateAdvancedFiltersCounter = function() {
    const counterDesktop = document.getElementById('advancedFiltersCounter');
    const counterMobile = document.getElementById('advancedFiltersCounterMobile');
    const counterMap = document.getElementById('advancedFiltersCounterMap');
    
    let count = 0;
    
    // Count only REAL active filters (не пустые поля)
    // 1. Отмеченные чекбоксы
    const checkedCheckboxes = document.querySelectorAll('#advancedFiltersPanel input[type="checkbox"]:checked');
    count += checkedCheckboxes.length;
    
    // 2. Заполненные числовые поля (только с реальными значениями)
    const numberInputs = document.querySelectorAll('#advancedFiltersPanel input[type="number"]');
    numberInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            count++;
        }
    });
    
    // 3. Выбранные опции в селектах (только не пустые)
    const selects = document.querySelectorAll('#advancedFiltersPanel select');
    selects.forEach(select => {
        if (select.value && select.value !== '' && select.value !== 'all') {
            count++;
        }
    });
    
    // Update DESKTOP badge
    if (counterDesktop) {
        if (count > 0) {
            counterDesktop.textContent = count;
            counterDesktop.classList.remove('hidden');
        } else {
            counterDesktop.classList.add('hidden');
        }
    }
    
    // Update MOBILE badge
    if (counterMobile) {
        if (count > 0) {
            counterMobile.textContent = count;
            counterMobile.classList.remove('hidden');
        } else {
            counterMobile.classList.add('hidden');
        }
    }
    
    // Update MAP badge (на мобильной карте)
    if (counterMap) {
        if (count > 0) {
            counterMap.textContent = count;
            counterMap.classList.remove('hidden');
        } else {
            counterMap.classList.add('hidden');
        }
    }
    
    console.log(`📊 Advanced filters count: ${count} (checked: ${checkedCheckboxes.length}, updated desktop + mobile + map badges)`);
    
    // ✅ КРИТИЧНО: Обновляем счетчик объявлений при изменении фильтров
    if (typeof window.updateFilteredCount === 'function') {
        window.updateFilteredCount();
    }
};

console.log('✅ property-filters.js loaded successfully');
console.log('✅ Functions registered:', {
    applyFilters: typeof window.applyFilters,
    applyPriceFilter: typeof window.applyPriceFilter,
    handleRoomFilterChange: typeof window.handleRoomFilterChange,
    updateAdvancedFiltersCounter: typeof window.updateAdvancedFiltersCounter
});


// ======================
// FILTER REMOVAL FUNCTIONS
// ======================

// ✅ AJAX VERSION - мгновенное удаление фильтров
window.removeRoomFilter = function(roomValue) {
    const checkbox = document.querySelector(`input[data-filter-type="rooms"][value="${roomValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        handleRoomFilterChange(); // Вызовет applyFilters() внутри
    }
};

window.removeDeveloperFilter = function(developerValue) {
    const checkbox = document.querySelector(`input[data-filter-type="developer"][value="${developerValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        window.applyFilters(); // AJAX фильтрация
    }
};

window.removePriceFilter = function() {
    const priceFromEl = document.getElementById('priceFrom');
    const priceToEl = document.getElementById('priceTo');
    if (priceFromEl) priceFromEl.value = '';
    if (priceToEl) priceToEl.value = '';
    
    const buttonText = document.getElementById('priceFilterText');
    if (buttonText) buttonText.textContent = 'Цена от-до, ₽';
    
    window.applyFilters(); // AJAX фильтрация
};

window.removeCompletionFilter = function(completionValue) {
    const checkbox = document.querySelector(`input[data-filter-type="completion"][value="${completionValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        window.applyFilters(); // AJAX фильтрация
    }
};

window.removeObjectClassFilter = function(objectClassValue) {
    const checkbox = document.querySelector(`input[data-filter-type="object_class"][value="${objectClassValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        window.applyFilters(); // AJAX фильтрация
    }
};

window.removeAreaFilter = function() {
    const areaFromEl = document.getElementById('areaFrom');
    const areaToEl = document.getElementById('areaTo');
    if (areaFromEl) areaFromEl.value = '';
    if (areaToEl) areaToEl.value = '';
    window.applyFilters(); // AJAX фильтрация
};

window.removeFloorFilter = function() {
    const floorFromEl = document.getElementById('floorFrom');
    const floorToEl = document.getElementById('floorTo');
    if (floorFromEl) floorFromEl.value = '';
    if (floorToEl) floorToEl.value = '';
    window.applyFilters(); // AJAX фильтрация
};

window.removeBuildingFloorFilter = function() {
    const buildingFloorFromEl = document.getElementById('maxFloorFrom') || document.querySelector('input[name="max_floor_from"]');
    const buildingFloorToEl = document.getElementById('maxFloorTo') || document.querySelector('input[name="max_floor_to"]');
    if (buildingFloorFromEl) buildingFloorFromEl.value = '';
    if (buildingFloorToEl) buildingFloorToEl.value = '';
    window.applyFilters(); // AJAX фильтрация
};

window.removeRenovationFilter = function(renovationValue) {
    const checkbox = document.querySelector(`input[data-filter-type="renovation"][value="${renovationValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        window.applyFilters(); // AJAX фильтрация
    }
};

window.removeBuildingStatusFilter = function(statusValue) {
    const checkbox = document.querySelector(`input[data-filter-type="building_released"][value="${statusValue}"]`);
    if (checkbox) {
        checkbox.checked = false;
        window.applyFilters(); // AJAX фильтрация
    }
};

// ✅ DISPLAY ACTIVE FILTERS - показать все активные фильтры
window.displayActiveFilters = function() {
    const container = document.getElementById('active-filters-list');
    if (!container) {
        console.log('⚠️ Active filters container not found');
        return;
    }
    
    const parentContainer = document.getElementById('active-filters-container');
    if (!parentContainer) {
        console.log('⚠️ Parent active filters container not found');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const filterTags = [];
    
    // Маппинг для человекочитаемых названий
    const filterLabels = {
        '0': 'Студия', '1': '1-комн', '2': '2-комн', '3': '3-комн', '4': '4-комн',
        'true': 'Сданный', 'false': 'В строительстве',
        'Бизнес': 'Класс: Бизнес', 'Комфорт': 'Класс: Комфорт', 'Премиум': 'Класс: Премиум',
        'no_renovation': 'Без отделки', 'with_renovation': 'Чистовая',
        'not_first': 'Не первый этаж', 'not_last': 'Не последний этаж'
    };
    
    // Rooms
    const rooms = urlParams.get('rooms');
    if (rooms) {
        rooms.split(',').forEach(room => {
            filterTags.push({ label: filterLabels[room] || `${room}-комн`, param: 'rooms', value: room });
        });
    }
    
    // Price (support both price_min/price_max and priceFrom/priceTo formats)
    const priceMin = urlParams.get('price_min') || urlParams.get('priceFrom');
    const priceMax = urlParams.get('price_max') || urlParams.get('priceTo');
    if (priceMin || priceMax) {
        let label = 'Цена: ';
        label += priceMin && priceMax ? `${priceMin}-${priceMax} млн ₽` : (priceMin ? `от ${priceMin} млн ₽` : `до ${priceMax} млн ₽`);
        filterTags.push({ label, param: 'price', value: null });
    }
    
    // Area
    const areaMin = urlParams.get('area_min');
    const areaMax = urlParams.get('area_max');
    if (areaMin || areaMax) {
        let label = 'Площадь: ';
        label += areaMin && areaMax ? `${areaMin}-${areaMax} м²` : (areaMin ? `от ${areaMin} м²` : `до ${areaMax} м²`);
        filterTags.push({ label, param: 'area', value: null });
    }
    
    // Floor
    const floorMin = urlParams.get('floor_min');
    const floorMax = urlParams.get('floor_max');
    if (floorMin || floorMax) {
        let label = 'Этаж: ';
        label += floorMin && floorMax ? `${floorMin}-${floorMax}` : (floorMin ? `от ${floorMin}` : `до ${floorMax}`);
        filterTags.push({ label, param: 'floor', value: null });
    }
    
    // Building floors
    const buildingFloorsMin = urlParams.get('building_floors_min');
    const buildingFloorsMax = urlParams.get('building_floors_max');
    if (buildingFloorsMin || buildingFloorsMax) {
        let label = 'Этажность: ';
        label += buildingFloorsMin && buildingFloorsMax ? `${buildingFloorsMin}-${buildingFloorsMax}` : (buildingFloorsMin ? `от ${buildingFloorsMin}` : `до ${buildingFloorsMax}`);
        filterTags.push({ label, param: 'building_floors', value: null });
    }
    
    // Build year
    const buildYearMin = urlParams.get('build_year_min');
    const buildYearMax = urlParams.get('build_year_max');
    if (buildYearMin || buildYearMax) {
        let label = 'Год сдачи: ';
        label += buildYearMin && buildYearMax ? `${buildYearMin}-${buildYearMax}` : (buildYearMin ? `от ${buildYearMin}` : `до ${buildYearMax}`);
        filterTags.push({ label, param: 'build_year', value: null });
    }
    
    // Developers - use ID → Name mapping
    const developers = urlParams.get('developers');
    if (developers) {
        console.log('🏗️ Developer IDs from URL:', developers);
        console.log('🗺️ Available developersMap:', window.developersMap);
        developers.split(',').forEach(dev => {
            // Try to get developer name from mapping (dev is now an ID)
            const developerName = window.developersMap && window.developersMap[dev] 
                ? window.developersMap[dev]
                : decodeURIComponent(dev); // Fallback for old URLs with names
            console.log(`🔍 Developer ID=${dev} → Name="${developerName}"`);
            filterTags.push({ label: developerName, param: 'developers', value: dev });
        });
    }
    
    // Districts
    const districts = urlParams.get('districts');
    if (districts) {
        districts.split(',').forEach(dist => {
            filterTags.push({ label: decodeURIComponent(dist), param: 'districts', value: dist });
        });
    }
    
    // Building released
    const buildingReleased = urlParams.get('building_released');
    if (buildingReleased) {
        buildingReleased.split(',').forEach(status => {
            filterTags.push({ label: filterLabels[status] || status, param: 'building_released', value: status });
        });
    }
    
    // Object class
    const objectClass = urlParams.get('object_class');
    if (objectClass) {
        objectClass.split(',').forEach(cls => {
            const decoded = decodeURIComponent(cls);
            filterTags.push({ label: filterLabels[decoded] || `Класс: ${decoded}`, param: 'object_class', value: cls });
        });
    }
    
    // Renovation
    const renovation = urlParams.get('renovation');
    if (renovation) {
        renovation.split(',').forEach(ren => {
            filterTags.push({ label: filterLabels[ren] || ren, param: 'renovation', value: ren });
        });
    }
    
    // Floor options
    const floorOptions = urlParams.get('floor_options');
    if (floorOptions) {
        floorOptions.split(',').forEach(opt => {
            filterTags.push({ label: filterLabels[opt] || opt, param: 'floor_options', value: opt });
        });
    }
    
    // Completion
    const completion = urlParams.get('completion');
    if (completion) {
        completion.split(',').forEach(year => {
            filterTags.push({ label: `Сдача: ${decodeURIComponent(year)}`, param: 'completion', value: year });
        });
    }
    
    // Cashback only
    if (urlParams.get('cashback_only') === 'true') {
        filterTags.push({ label: 'Только с кэшбеком', param: 'cashback_only', value: 'true' });
    }
    
    // Render
    if (filterTags.length > 0) {
        container.innerHTML = filterTags.map(tag => `
            <span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                ${tag.label}
                <button onclick="removeFilter('${tag.param}', ${tag.value ? `'${tag.value}'` : 'null'})" 
                        class="text-blue-600 hover:text-blue-800 font-bold ml-1">×</button>
            </span>
        `).join('');
        parentContainer.classList.remove('hidden');
        console.log('✅ Displayed', filterTags.length, 'active filters');
    } else {
        parentContainer.classList.add('hidden');
        console.log('ℹ️ No active filters to display');
    }
};

// Remove individual filter - AJAX VERSION
window.removeFilter = function(param, value) {
    console.log('🗑️ Removing filter:', param, value);
    
    // Обновляем UI элементы (снимаем чекбоксы или очищаем поля)
    if (value === null) {
        // Для range фильтров (цена, площадь, этаж и т.д.)
        if (param === 'price') {
            const priceFromEl = document.getElementById('priceFrom');
            const priceToEl = document.getElementById('priceTo');
            if (priceFromEl) priceFromEl.value = '';
            if (priceToEl) priceToEl.value = '';
            const buttonText = document.getElementById('priceFilterText');
            if (buttonText) buttonText.textContent = 'Цена от-до, ₽';
        }
        else if (param === 'area') {
            const areaFromEl = document.getElementById('areaFrom');
            const areaToEl = document.getElementById('areaTo');
            if (areaFromEl) areaFromEl.value = '';
            if (areaToEl) areaToEl.value = '';
        }
        else if (param === 'floor') {
            const floorFromEl = document.getElementById('floorFrom');
            const floorToEl = document.getElementById('floorTo');
            if (floorFromEl) floorFromEl.value = '';
            if (floorToEl) floorToEl.value = '';
        }
        else if (param === 'building_floors') {
            const maxFloorFromEl = document.getElementById('maxFloorFrom');
            const maxFloorToEl = document.getElementById('maxFloorTo');
            if (maxFloorFromEl) maxFloorFromEl.value = '';
            if (maxFloorToEl) maxFloorToEl.value = '';
        }
        else if (param === 'build_year') {
            const buildYearFromEl = document.getElementById('buildYearFrom');
            const buildYearToEl = document.getElementById('buildYearTo');
            if (buildYearFromEl) buildYearFromEl.value = '';
            if (buildYearToEl) buildYearToEl.value = '';
        }
    } else {
        // Для чекбоксов
        const checkbox = document.querySelector(`input[data-filter-type="${param}"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }
    
    // Применяем фильтры через AJAX
    window.applyFilters();
};

console.log('✅ Active filters display functions loaded');
console.log('🚀🚀🚀 PROPERTY-FILTERS.JS - AJAX MODE ACTIVATED 🚀🚀🚀');
console.log('✅ Functions registered:', {
    applyFilters: typeof window.applyFilters,
    applyPriceFilter: typeof window.applyPriceFilter,
    handleRoomFilterChange: typeof window.handleRoomFilterChange,
    updateAdvancedFiltersCounter: typeof window.updateAdvancedFiltersCounter,
    removeFilter: typeof window.removeFilter,
    debounceApplyFilters: typeof debounceApplyFilters
});
