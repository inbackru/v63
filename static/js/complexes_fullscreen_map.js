// Complexes Fullscreen Map (Yandex Maps - Residential Complexes)
console.log('🏢 complexes_fullscreen_map.js загружен');
let fullscreenComplexesMapInstance = null;
let mapInitTimeout = null;
let ymapsRetryTimeout = null;
let allComplexMarkers = []; // Store all markers for filtering
let allComplexesData = []; // Store all complexes data

// Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Get marker color based on complex status
function getComplexMarkerColor(status) {
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower.includes('сдан') || statusLower.includes('готов')) {
        return '#22c55e'; // Green - delivered
    } else if (statusLower.includes('строит') || statusLower.includes('стро')) {
        return '#3b82f6'; // Blue - under construction
    } else if (statusLower.includes('план') || statusLower.includes('проект')) {
        return '#f97316'; // Orange - planned
    }
    
    return '#8b5cf6'; // Purple - default
}

// Get status display text
function getStatusDisplayText(status) {
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower.includes('сдан') || statusLower.includes('готов')) {
        return 'Сдан';
    } else if (statusLower.includes('строит') || statusLower.includes('стро')) {
        return 'Строится';
    } else if (statusLower.includes('план') || statusLower.includes('проект')) {
        return 'Планируется';
    }
    
    return status || 'Не указан';
}

// Open fullscreen complexes map modal
function openFullscreenComplexesMap() {
    const modal = document.getElementById('fullscreenComplexesMapModal');
    if (!modal) {
        console.warn('🏢 Modal element not found');
        return;
    }
    
    console.log('🏢 Opening fullscreen complexes map modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize map after modal is visible
    mapInitTimeout = setTimeout(() => {
        if (!modal.classList.contains('hidden')) {
            initFullscreenComplexesMap();
        }
        mapInitTimeout = null;
    }, 100);
}

// Close fullscreen complexes map modal
function closeFullscreenComplexesMap() {
    const modal = document.getElementById('fullscreenComplexesMapModal');
    if (!modal) return;
    
    console.log('🏢 Closing fullscreen complexes map modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Cancel pending map initialization
    if (mapInitTimeout) {
        clearTimeout(mapInitTimeout);
        mapInitTimeout = null;
    }
    
    // Cancel ymaps retry timeout
    if (ymapsRetryTimeout) {
        clearTimeout(ymapsRetryTimeout);
        ymapsRetryTimeout = null;
    }
    
    // Destroy map instance to free memory
    if (fullscreenComplexesMapInstance) {
        fullscreenComplexesMapInstance.destroy();
        fullscreenComplexesMapInstance = null;
    }
}

// Group complexes by location (same coordinates)
function groupComplexesByLocation(complexes) {
    const groups = {};
    
    complexes.forEach(complex => {
        const lat = complex.latitude || (complex.coordinates && complex.coordinates.lat);
        const lng = complex.longitude || (complex.coordinates && complex.coordinates.lng);
        
        if (lat && lng) {
            const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
            if (!groups[key]) {
                groups[key] = {
                    lat: lat,
                    lng: lng,
                    complexes: []
                };
            }
            // Ensure complex has coordinates in expected format
            if (!complex.coordinates) {
                complex.coordinates = { lat: lat, lng: lng };
            }
            groups[key].complexes.push(complex);
        }
    });
    
    return Object.values(groups);
}

// Format price for display
function formatPrice(price) {
    if (!price) return 'По запросу';
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

// Create enhanced Yandex Maps marker for complexes
function createEnhancedComplexMarker(complexes) {
    const count = complexes.length;
    const coords = [complexes[0].coordinates.lat, complexes[0].coordinates.lng];
    
    // Determine marker color based on first complex's status
    const markerColor = getComplexMarkerColor(complexes[0].status);
    
    // Get price info
    const minPrice = Math.min(...complexes.map(c => c.min_price || Infinity).filter(p => p !== Infinity));
    const priceText = minPrice !== Infinity ? Math.round(minPrice / 1000000 * 10) / 10 + 'М' : '?';
    
    // Create icon layout with status-based color
    const iconLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="ymap-complex-marker">' +
        '<div class="marker-inner" data-color="' + markerColor + '">' +
        (count > 1 ? '<span class="marker-count">' + count + '</span>' : '') +
        '<span class="marker-text">от ' + priceText + '₽</span>' +
        '</div>' +
        '</div>',
        {
            build: function() {
                iconLayout.superclass.build.call(this);
                const marker = this.getParentElement().querySelector('.ymap-complex-marker');
                if (marker) {
                    marker.style.cssText = 'position: relative;';
                }
                const inner = this.getParentElement().querySelector('.marker-inner');
                if (inner) {
                    const color = inner.getAttribute('data-color');
                    inner.style.cssText = `background: ${color}; color: white; padding: 6px 12px; border-radius: 20px; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3); border: 2px solid white; font-size: 12px; font-weight: bold; white-space: nowrap; font-family: Inter, system-ui, sans-serif; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;`;
                }
                const countElem = this.getParentElement().querySelector('.marker-count');
                if (countElem) {
                    countElem.style.cssText = 'background: rgba(255,255,255,0.3); border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; padding: 0 4px;';
                }
            }
        }
    );
    
    const placemark = new ymaps.Placemark(coords, {
        complexes: complexes,
        hintContent: `${count} ${count === 1 ? 'жилой комплекс' : 'жилых комплекса'}`
    }, {
        iconLayout: iconLayout,
        iconShape: {
            type: 'Rectangle',
            coordinates: [[-70, -20], [70, 20]]
        }
    });
    
    // Bind click event
    placemark.events.add('click', function(e) {
        e.stopPropagation();
        showComplexBottomSheet(complexes);
    });
    
    return placemark;
}

// Show complex bottom sheet with cards
function showComplexBottomSheet(complexes) {
    const bottomSheet = document.getElementById('complexBottomSheet');
    const backdrop = document.getElementById('complexBottomSheetBackdrop');
    const container = document.getElementById('bottomSheetComplexesContainer');
    
    if (!bottomSheet || !backdrop || !container) {
        console.warn('🏢 Bottom sheet elements not found');
        console.warn('bottomSheet:', !!bottomSheet, 'backdrop:', !!backdrop, 'container:', !!container);
        return;
    }
    
    console.log(`🏢 Opening bottom sheet with ${complexes.length} complexes`);
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create complex cards
    complexes.forEach((complex, index) => {
        const card = createComplexCard(complex, index);
        container.appendChild(card);
    });
    
    // Show bottom sheet with animation
    backdrop.classList.remove('hidden');
    bottomSheet.classList.remove('hidden');
    
    // Trigger animation by removing translate-y-full
    setTimeout(() => {
        backdrop.style.opacity = '1';
        bottomSheet.style.transform = 'translateY(0)';
    }, 10);
}

// Close complex bottom sheet
function closeComplexBottomSheet() {
    const bottomSheet = document.getElementById('complexBottomSheet');
    const backdrop = document.getElementById('complexBottomSheetBackdrop');
    
    if (!bottomSheet || !backdrop) return;
    
    console.log('🏢 Closing complex bottom sheet');
    
    // Trigger close animation
    backdrop.style.opacity = '0';
    bottomSheet.style.transform = 'translateY(100%)';
    
    // Hide elements after animation completes
    setTimeout(() => {
        backdrop.classList.add('hidden');
        bottomSheet.classList.add('hidden');
    }, 300);
}

// Create complex card for bottom sheet
function createComplexCard(complex, index) {
    const card = document.createElement('div');
    card.className = 'bottom-sheet-complex-card bg-white rounded-xl shadow-md overflow-hidden';
    
    const name = complex.name || 'Жилой комплекс';
    const developer = complex.developer_name || complex.developer || 'Не указан';
    const status = getStatusDisplayText(complex.status);
    const statusColor = getComplexMarkerColor(complex.status);
    const image = complex.main_image || complex.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    const complexUrl = complex.url || '/residential-complex/' + complex.id;
    
    // Price range
    let priceRange = 'По запросу';
    if (complex.min_price && complex.max_price) {
        const minPriceFormatted = Math.round(complex.min_price / 1000000 * 10) / 10;
        const maxPriceFormatted = Math.round(complex.max_price / 1000000 * 10) / 10;
        priceRange = `${minPriceFormatted} - ${maxPriceFormatted} млн ₽`;
    } else if (complex.min_price) {
        const minPriceFormatted = Math.round(complex.min_price / 1000000 * 10) / 10;
        priceRange = `от ${minPriceFormatted} млн ₽`;
    }
    
    // Apartments count
    const apartmentsCount = complex.available_apartments_count || complex.total_apartments || 0;
    const apartmentsText = apartmentsCount > 0 ? `${apartmentsCount} ${apartmentsCount === 1 ? 'квартира' : 'квартир'}` : 'Нет данных';
    
    // Create image element
    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.alt = name;
    imgElement.className = 'w-full h-32 object-cover';
    imgElement.addEventListener('error', function() {
        this.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    });
    
    card.innerHTML = `
        <a href="${complexUrl}" class="flex gap-3">
            <div class="relative w-32 flex-shrink-0">
                <div class="img-container"></div>
                <div class="absolute top-1 left-1 px-2 py-0.5 rounded text-xs font-bold shadow text-white" style="background-color: ${statusColor};">
                    ${status}
                </div>
            </div>
            <div class="flex-1 py-2 pr-2">
                <div class="text-base font-bold text-gray-900 mb-1">${name}</div>
                <div class="text-sm text-gray-600 mb-1">
                    <span class="text-xs">👷</span> ${developer}
                </div>
                <div class="text-sm font-semibold text-blue-600 mb-1">${priceRange}</div>
                <div class="text-xs text-gray-500">
                    📦 ${apartmentsText}
                </div>
            </div>
        </a>
    `;
    
    // Insert image
    const imgContainer = card.querySelector('.img-container');
    if (imgContainer) {
        imgContainer.appendChild(imgElement);
    }
    
    return card;
}

// Initialize fullscreen complexes map
function initFullscreenComplexesMap() {
    const modal = document.getElementById('fullscreenComplexesMapModal');
    const mapContainer = document.getElementById('fullscreenComplexesMapContainer');
    
    // Bail out if modal is closed or map already exists
    if (!modal || modal.classList.contains('hidden') || !mapContainer || fullscreenComplexesMapInstance) {
        console.log('🏢 Skipping map init - modal closed or map exists');
        return;
    }
    
    if (typeof ymaps === 'undefined') {
        console.warn('🏢 ymaps not loaded yet, retrying in 500ms');
        ymapsRetryTimeout = setTimeout(initFullscreenComplexesMap, 500);
        return;
    }
    
    ymaps.ready(function() {
        try {
            console.log('🏢 Initializing fullscreen Yandex Map for complexes');
            
            // Create map with controls (use correct ID!)
            fullscreenComplexesMapInstance = new ymaps.Map('fullscreenComplexesMap', {
                center: [45.0355, 38.9753],
                zoom: 11,
                controls: ['zoomControl', 'geolocationControl']
            });
            
            // Load complexes data
            fetch('/api/residential-complexes-map')
                .then(response => response.json())
                .then(data => {
                    if (!data || !data.complexes || data.complexes.length === 0) {
                        console.warn('🏢 No complexes loaded');
                        return;
                    }
                    
                    const allComplexes = data.complexes;
                    console.log(`🏢 Loaded ${allComplexes.length} complexes`);
                    
                    // Debug: Check room data
                    const complexesWithRooms = allComplexes.filter(c => c.available_rooms && c.available_rooms.length > 0);
                    console.log(`🏢 Complexes with room data: ${complexesWithRooms.length}/${allComplexes.length}`);
                    if (complexesWithRooms.length > 0) {
                        console.log(`🏢 Example rooms:`, complexesWithRooms.slice(0, 3).map(c => ({
                            name: c.name,
                            rooms: c.available_rooms
                        })));
                    }
                    
                    // Store complexes data globally for filtering
                    allComplexesData = allComplexes;
                    
                    // Update counter
                    const counter = document.getElementById('mapComplexesCount');
                    if (counter) {
                        counter.textContent = allComplexes.length;
                    }
                    
                    // Group complexes by coordinates
                    const grouped = groupComplexesByLocation(allComplexes);
                    console.log(`🏢 Grouped ${allComplexes.length} complexes into ${grouped.length} location groups`);
                    
                    // Clear previous markers
                    allComplexMarkers = [];
                    
                    // Create markers for each group and store them
                    grouped.forEach(group => {
                        try {
                            const placemark = createEnhancedComplexMarker(group.complexes);
                            fullscreenComplexesMapInstance.geoObjects.add(placemark);
                            // Store marker with its complexes data for filtering
                            allComplexMarkers.push({
                                marker: placemark,
                                complexes: group.complexes
                            });
                        } catch (error) {
                            console.error('🏢 Error creating marker:', error, group);
                        }
                    });
                    
                    console.log(`🏢 Created ${grouped.length} markers on fullscreen map`);
                    
                    // Auto-center map to show all complexes
                    const coords = allComplexes
                        .filter(c => c.coordinates && c.coordinates.lat && c.coordinates.lng)
                        .map(c => c.coordinates);
                    
                    if (coords.length > 0) {
                        const bounds = coords.reduce((acc, coord) => {
                            if (!acc.minLat || coord.lat < acc.minLat) acc.minLat = coord.lat;
                            if (!acc.maxLat || coord.lat > acc.maxLat) acc.maxLat = coord.lat;
                            if (!acc.minLng || coord.lng < acc.minLng) acc.minLng = coord.lng;
                            if (!acc.maxLng || coord.lng > acc.maxLng) acc.maxLng = coord.lng;
                            return acc;
                        }, {});
                        
                        fullscreenComplexesMapInstance.setBounds([
                            [bounds.minLat, bounds.minLng],
                            [bounds.maxLat, bounds.maxLng]
                        ], {
                            checkZoomRange: true,
                            zoomMargin: 40
                        });
                        
                        console.log(`🏢 Map centered on ${coords.length} complexes`);
                    }
                })
                .catch(error => {
                    console.error('🏢 Error loading complexes for fullscreen map:', error);
                });
            
            console.log('🏢 Fullscreen Yandex Map initialized for complexes');
        } catch (error) {
            console.error('🏢 Error initializing fullscreen complexes map:', error);
        }
    });
}

// Return to list view
function returnToComplexesList() {
    console.log('🏢 Returning to complexes list');
    closeFullscreenComplexesMap();
    // Optionally redirect to list page
    // window.location.href = '/residential-complexes';
}

// ESC key handler for modal
function handleComplexMapEscKey(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
        const modal = document.getElementById('fullscreenComplexesMapModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeFullscreenComplexesMap();
        }
    }
}

// Add ESC key listener
document.addEventListener('keydown', handleComplexMapEscKey);

// Initialize filter chip handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏢 Initializing fullscreen complex map filter handlers');
    
    // Handle status filter chips
    const filterChips = document.querySelectorAll('.fullscreen-status-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            const status = this.getAttribute('data-status');
            toggleStatusFilter(this, status);
        });
    });
    
    // Handle room filter chips
    const roomChips = document.querySelectorAll('.complex-room-chip');
    roomChips.forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleRoomChip(this);
        });
    });
    
    // Debounce timer for input fields
    let filterCountDebounce = null;
    
    // Handle price and year input fields
    const priceFromInput = document.getElementById('complexPriceFrom');
    const priceToInput = document.getElementById('complexPriceTo');
    const yearFromInput = document.getElementById('complexYearFrom');
    const yearToInput = document.getElementById('complexYearTo');
    
    [priceFromInput, priceToInput, yearFromInput, yearToInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                // Clear previous timeout
                if (filterCountDebounce) {
                    clearTimeout(filterCountDebounce);
                }
                
                // Update count after 500ms of no typing
                filterCountDebounce = setTimeout(() => {
                    updateComplexFilterCount();
                }, 500);
            });
        }
    });
});

// Toggle status filter
function toggleStatusFilter(chipElement, status) {
    const isActive = chipElement.classList.contains('active');
    
    if (isActive) {
        // Deactivate
        chipElement.classList.remove('active');
        chipElement.style.backgroundColor = '';
        chipElement.style.color = '';
        chipElement.style.borderColor = '';
    } else {
        // Activate
        chipElement.classList.add('active');
        const color = getComplexMarkerColor(status);
        chipElement.style.backgroundColor = color;
        chipElement.style.color = 'white';
        chipElement.style.borderColor = color;
    }
    
    // Update count immediately when status chip is toggled
    updateComplexFilterCount();
    
    // Trigger map refresh with filters
    applyFullscreenFilters();
}

// Apply filters to fullscreen map
function applyFullscreenFilters() {
    if (!fullscreenComplexesMapInstance) {
        console.warn('🏢 Map instance not initialized');
        return;
    }
    
    // Get active status filters
    const activeChips = document.querySelectorAll('.fullscreen-status-chip.active');
    const activeStatuses = Array.from(activeChips).map(chip => chip.getAttribute('data-status'));
    
    console.log('🏢 Applying fullscreen filters:', activeStatuses);
    
    // If no filters active, show all markers
    if (activeStatuses.length === 0) {
        console.log('🏢 No filters active - showing all complexes');
        allComplexMarkers.forEach(markerData => {
            markerData.marker.options.set('visible', true);
        });
        return;
    }
    
    // Filter markers based on complex statuses
    let visibleCount = 0;
    allComplexMarkers.forEach(markerData => {
        // Check if any complex in this marker matches the active filters
        const hasMatchingStatus = markerData.complexes.some(complex => {
            const complexStatus = getStatusDisplayText(complex.status);
            return activeStatuses.includes(complexStatus);
        });
        
        // Show/hide marker based on filter match
        markerData.marker.options.set('visible', hasMatchingStatus);
        if (hasMatchingStatus) visibleCount++;
    });
    
    console.log(`🏢 Filtered: ${visibleCount}/${allComplexMarkers.length} marker groups visible`);
}

// ==================== FILTER FUNCTIONS ====================

// Open complex filters sheet
function openComplexFiltersSheet() {
    const sheet = document.getElementById('complexFiltersSheet');
    const backdrop = document.getElementById('complexFiltersBackdrop');
    
    if (!sheet || !backdrop) return;
    
    console.log('🏢 Opening complex filters sheet');
    
    // Count currently visible markers (undefined = visible by default)
    let visibleCount = 0;
    allComplexMarkers.forEach(markerData => {
        const isVisible = markerData.marker.options.get('visible');
        // If visibility not set (undefined) or explicitly true, count it
        if (isVisible === undefined || isVisible === true) {
            visibleCount++;
        }
    });
    
    console.log(`🏢 Current visible markers: ${visibleCount}/${allComplexMarkers.length}`);
    updateComplexFilterButton(visibleCount);
    
    backdrop.classList.remove('hidden');
    sheet.classList.remove('hidden');
    
    setTimeout(() => {
        backdrop.style.opacity = '1';
        sheet.style.transform = 'translateY(0)';
    }, 10);
}

// Close complex filters sheet
function closeComplexFiltersSheet() {
    const sheet = document.getElementById('complexFiltersSheet');
    const backdrop = document.getElementById('complexFiltersBackdrop');
    
    if (!sheet || !backdrop) return;
    
    console.log('🏢 Closing complex filters sheet');
    
    backdrop.style.opacity = '0';
    sheet.style.transform = 'translateY(100%)';
    
    setTimeout(() => {
        backdrop.classList.add('hidden');
        sheet.classList.add('hidden');
    }, 300);
}

// Toggle room chip selection
function toggleRoomChip(chipElement) {
    const isActive = chipElement.classList.contains('active');
    
    if (isActive) {
        chipElement.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-600');
        chipElement.classList.add('border-gray-300');
    } else {
        chipElement.classList.add('active', 'bg-blue-600', 'text-white', 'border-blue-600');
        chipElement.classList.remove('border-gray-300');
    }
    
    // Update count immediately when room chip is toggled
    updateComplexFilterCount();
}

// Pluralize "ЖК" correctly in Russian
function pluralizeZhk(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return `${count} ЖК`;
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return `${count} ЖК`;
    } else {
        return `${count} ЖК`;
    }
}

// Update filter button text with count
function updateComplexFilterButton(count) {
    const buttonText = `Показать ${pluralizeZhk(count)}`;
    
    // Update quick filters button
    const quickButton = document.getElementById('complexFiltersApplyBtn');
    if (quickButton) {
        quickButton.textContent = buttonText;
    }
    
    // Update advanced filters button
    const advancedButton = document.getElementById('complexAdvancedFiltersApplyBtn');
    if (advancedButton) {
        advancedButton.textContent = buttonText;
    }
    
    console.log(`🏢 Updated filter buttons: "${buttonText}"`);
}

// Reset complex filters
function resetComplexFilters() {
    document.getElementById('complexPriceFrom').value = '';
    document.getElementById('complexPriceTo').value = '';
    document.getElementById('complexYearFrom').value = '';
    document.getElementById('complexYearTo').value = '';
    
    // Reset room chips
    document.querySelectorAll('.complex-room-chip').forEach(chip => {
        chip.classList.remove('active', 'bg-blue-600', 'text-white', 'border-blue-600');
        chip.classList.add('border-gray-300');
    });
    
    console.log('🏢 Reset quick filters');
}

// Apply complex filters
function applyComplexFilters() {
    console.log('🏢 Applying complex filters');
    
    const priceFrom = parseFloat(document.getElementById('complexPriceFrom').value) || null;
    const priceTo = parseFloat(document.getElementById('complexPriceTo').value) || null;
    const yearFrom = parseInt(document.getElementById('complexYearFrom').value) || null;
    const yearTo = parseInt(document.getElementById('complexYearTo').value) || null;
    
    // Get active status filters
    const activeChips = document.querySelectorAll('.fullscreen-status-chip.active');
    const activeStatuses = Array.from(activeChips).map(chip => chip.getAttribute('data-status'));
    
    // Get active room filters
    const activeRoomChips = document.querySelectorAll('.complex-room-chip.active');
    const activeRooms = Array.from(activeRoomChips).map(chip => chip.getAttribute('data-rooms'));
    
    // Filter markers and get visible count
    const visibleCount = filterComplexMarkers({
        priceFrom,
        priceTo,
        yearFrom,
        yearTo,
        statuses: activeStatuses,
        rooms: activeRooms
    });
    
    // Update button text with count
    updateComplexFilterButton(visibleCount);
    
    closeComplexFiltersSheet();
}

// Open advanced filters modal
function openComplexAdvancedFilters() {
    const modal = document.getElementById('complexAdvancedFiltersModal');
    if (!modal) return;
    
    console.log('🏢 Opening advanced filters modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close advanced filters modal
function closeComplexAdvancedFilters() {
    const modal = document.getElementById('complexAdvancedFiltersModal');
    if (!modal) return;
    
    console.log('🏢 Closing advanced filters modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Reset advanced filters
function resetComplexAdvancedFilters() {
    document.querySelectorAll('.complex-developer-filter').forEach(cb => cb.checked = false);
    document.querySelectorAll('.complex-district-filter').forEach(cb => cb.checked = false);
    document.querySelectorAll('.complex-class-filter').forEach(cb => cb.checked = false);
    console.log('🏢 Reset advanced filters');
}

// Apply advanced filters
function applyComplexAdvancedFilters() {
    console.log('🏢 Applying advanced filters');
    
    const priceFrom = parseFloat(document.getElementById('complexPriceFrom').value) || null;
    const priceTo = parseFloat(document.getElementById('complexPriceTo').value) || null;
    const yearFrom = parseInt(document.getElementById('complexYearFrom').value) || null;
    const yearTo = parseInt(document.getElementById('complexYearTo').value) || null;
    
    const developers = Array.from(document.querySelectorAll('.complex-developer-filter:checked')).map(cb => parseInt(cb.value));
    const districts = Array.from(document.querySelectorAll('.complex-district-filter:checked')).map(cb => parseInt(cb.value));
    const classes = Array.from(document.querySelectorAll('.complex-class-filter:checked')).map(cb => cb.value);
    
    const activeChips = document.querySelectorAll('.fullscreen-status-chip.active');
    const activeStatuses = Array.from(activeChips).map(chip => chip.getAttribute('data-status'));
    
    const activeRoomChips = document.querySelectorAll('.complex-room-chip.active');
    const activeRooms = Array.from(activeRoomChips).map(chip => chip.getAttribute('data-rooms'));
    
    // Filter markers and get visible count
    const visibleCount = filterComplexMarkers({
        priceFrom,
        priceTo,
        yearFrom,
        yearTo,
        developers,
        districts,
        classes,
        statuses: activeStatuses,
        rooms: activeRooms
    });
    
    // Update button text with count
    updateComplexFilterButton(visibleCount);
    
    closeComplexAdvancedFilters();
    closeComplexFiltersSheet();
}

// Toggle developers filter section
function toggleComplexDevelopersFilter() {
    const content = document.getElementById('complexDevelopersContent');
    const arrow = document.getElementById('complexDevelopersArrow');
    
    if (!content || !arrow) return;
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Toggle districts filter section
function toggleComplexDistrictsFilter() {
    const content = document.getElementById('complexDistrictsContent');
    const arrow = document.getElementById('complexDistrictsArrow');
    
    if (!content || !arrow) return;
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Count matching complexes without applying filters to map
function countMatchingComplexes(filters) {
    if (!fullscreenComplexesMapInstance || !allComplexMarkers) {
        return 0;
    }
    
    let count = 0;
    
    allComplexMarkers.forEach(markerData => {
        const matchingComplexes = markerData.complexes.filter(complex => {
            // Status filter
            if (filters.statuses && filters.statuses.length > 0) {
                const complexStatus = getStatusDisplayText(complex.status);
                if (!filters.statuses.includes(complexStatus)) {
                    return false;
                }
            }
            
            // Price filter
            if (filters.priceFrom && complex.min_price) {
                if (complex.min_price < filters.priceFrom * 1000000) return false;
            }
            if (filters.priceTo && complex.min_price) {
                if (complex.min_price > filters.priceTo * 1000000) return false;
            }
            
            // Year filter
            if (filters.yearFrom && complex.completion_year) {
                if (complex.completion_year < filters.yearFrom) return false;
            }
            if (filters.yearTo && complex.completion_year) {
                if (complex.completion_year > filters.yearTo) return false;
            }
            
            // Rooms filter
            if (filters.rooms && filters.rooms.length > 0) {
                if (complex.available_rooms && Array.isArray(complex.available_rooms)) {
                    const hasMatchingRoom = filters.rooms.some(room => complex.available_rooms.includes(room));
                    if (!hasMatchingRoom) return false;
                } else {
                    return false;
                }
            }
            
            return true;
        });
        
        count += matchingComplexes.length;
    });
    
    return count;
}

// Update filter count display without applying to map
function updateComplexFilterCount() {
    const priceFrom = parseFloat(document.getElementById('complexPriceFrom').value) || null;
    const priceTo = parseFloat(document.getElementById('complexPriceTo').value) || null;
    const yearFrom = parseInt(document.getElementById('complexYearFrom').value) || null;
    const yearTo = parseInt(document.getElementById('complexYearTo').value) || null;
    
    // Get active status filters
    const activeChips = document.querySelectorAll('.fullscreen-status-chip.active');
    const activeStatuses = Array.from(activeChips).map(chip => chip.getAttribute('data-status'));
    
    // Get active room filters
    const activeRoomChips = document.querySelectorAll('.complex-room-chip.active');
    const activeRooms = Array.from(activeRoomChips).map(chip => chip.getAttribute('data-rooms'));
    
    // Count matching complexes
    const count = countMatchingComplexes({
        priceFrom,
        priceTo,
        yearFrom,
        yearTo,
        statuses: activeStatuses,
        rooms: activeRooms
    });
    
    // Update button text
    updateComplexFilterButton(count);
    
    console.log(`🏢 Filter count updated: ${count} complexes match current filters`);
}

// Main filter function for complex markers
function filterComplexMarkers(filters) {
    if (!fullscreenComplexesMapInstance) {
        console.warn('🏢 Map instance not initialized');
        return 0;
    }
    
    console.log('🏢 Filtering markers with:', filters);
    
    let visibleComplexCount = 0;
    
    allComplexMarkers.forEach(markerData => {
        // Filter complexes in this marker group
        const matchingComplexes = markerData.complexes.filter(complex => {
            // Status filter
            if (filters.statuses && filters.statuses.length > 0) {
                const complexStatus = getStatusDisplayText(complex.status);
                if (!filters.statuses.includes(complexStatus)) {
                    return false;
                }
            }
            
            // Price filter (convert to rubles for comparison)
            if (filters.priceFrom && complex.min_price) {
                if (complex.min_price < filters.priceFrom * 1000000) return false;
            }
            if (filters.priceTo && complex.min_price) {
                if (complex.min_price > filters.priceTo * 1000000) return false;
            }
            
            // Year filter
            if (filters.yearFrom && complex.completion_year) {
                if (complex.completion_year < filters.yearFrom) return false;
            }
            if (filters.yearTo && complex.completion_year) {
                if (complex.completion_year > filters.yearTo) return false;
            }
            
            // Developer filter - check both developer_id and developer name
            if (filters.developers && filters.developers.length > 0) {
                const matchesDeveloper = filters.developers.some(devFilter => {
                    // Support both ID (number/string) and name matching
                    const devFilterStr = String(devFilter);
                    const complexDevId = complex.developer_id ? String(complex.developer_id) : null;
                    const complexDevName = complex.developer || complex.developer_name;
                    
                    return (complexDevId && complexDevId === devFilterStr) || 
                           (complexDevName && complexDevName === devFilter);
                });
                if (!matchesDeveloper) return false;
            }
            
            // District filter - check both district_id and district name
            if (filters.districts && filters.districts.length > 0) {
                const matchesDistrict = filters.districts.some(distFilter => {
                    // Support both ID (number/string) and name matching
                    const distFilterStr = String(distFilter);
                    const complexDistId = complex.district_id ? String(complex.district_id) : null;
                    const complexDistName = complex.district;
                    
                    return (complexDistId && complexDistId === distFilterStr) || 
                           (complexDistName && complexDistName === distFilter);
                });
                if (!matchesDistrict) return false;
            }
            
            // Class filter
            if (filters.classes && filters.classes.length > 0) {
                if (!filters.classes.includes(complex.class)) return false;
            }
            
            // Rooms filter - check if complex has properties with selected room types
            if (filters.rooms && filters.rooms.length > 0) {
                // If complex.available_rooms is an array like ["студия", "1-комн", "2-комн"]
                if (complex.available_rooms && Array.isArray(complex.available_rooms)) {
                    const hasMatchingRoom = filters.rooms.some(room => complex.available_rooms.includes(room));
                    if (!hasMatchingRoom) return false;
                } else {
                    // If no room data available, skip this complex
                    return false;
                }
            }
            
            return true;
        });
        
        // Show marker if it has at least one matching complex
        markerData.marker.options.set('visible', matchingComplexes.length > 0);
        
        // Count complexes, not marker groups
        visibleComplexCount += matchingComplexes.length;
    });
    
    console.log(`🏢 Filtered: ${visibleComplexCount} complexes visible in ${allComplexMarkers.filter(m => m.marker.options.get('visible')).length} marker groups`);
    return visibleComplexCount;
}

// Make functions globally available
window.openFullscreenComplexesMap = openFullscreenComplexesMap;
window.closeFullscreenComplexesMap = closeFullscreenComplexesMap;
window.closeComplexBottomSheet = closeComplexBottomSheet;
window.returnToComplexesList = returnToComplexesList;
window.openComplexFiltersSheet = openComplexFiltersSheet;
window.closeComplexFiltersSheet = closeComplexFiltersSheet;
window.resetComplexFilters = resetComplexFilters;
window.applyComplexFilters = applyComplexFilters;
window.openComplexAdvancedFilters = openComplexAdvancedFilters;
window.closeComplexAdvancedFilters = closeComplexAdvancedFilters;
window.resetComplexAdvancedFilters = resetComplexAdvancedFilters;
window.applyComplexAdvancedFilters = applyComplexAdvancedFilters;
window.toggleComplexDevelopersFilter = toggleComplexDevelopersFilter;
window.toggleComplexDistrictsFilter = toggleComplexDistrictsFilter;

console.log('🏢 Complexes fullscreen map module loaded successfully');
