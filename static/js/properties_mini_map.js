// Properties Mini Map (Yandex Maps - Avito-style)
console.log('🗺️ properties_mini_map.js загружен');
let miniPropertiesMapInstance = null;
let fullscreenMapInstance = null;
let mapInitTimeout = null;
let ymapsRetryTimeout = null;

// Check if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768;
}

function clusterCoordinates(coordinates, radius) {
    const clusters = [];
    const used = new Set();
    
    coordinates.forEach((coord, i) => {
        if (used.has(i)) return;
        
        const cluster = {
            lat: coord.lat,
            lng: coord.lng,
            count: 1
        };
        
        coordinates.forEach((other, j) => {
            if (i !== j && !used.has(j)) {
                const distance = Math.sqrt(
                    Math.pow(coord.lat - other.lat, 2) + 
                    Math.pow(coord.lng - other.lng, 2)
                );
                
                if (distance < radius) {
                    cluster.count++;
                    used.add(j);
                }
            }
        });
        
        used.add(i);
        clusters.push(cluster);
    });
    
    return clusters;
}

function initMiniPropertiesMap() {
    const mapElement = document.getElementById('miniPropertiesMap');
    if (!mapElement || miniPropertiesMapInstance) return;
    
    if (typeof ymaps === 'undefined') {
        console.warn('ymaps not loaded yet, retrying in 500ms');
        setTimeout(initMiniPropertiesMap, 500);
        return;
    }
    
    ymaps.ready(function() {
        try {
            // Начальный центр (Краснодарский край) - будет пересчитан после загрузки объектов
            miniPropertiesMapInstance = new ymaps.Map('miniPropertiesMap', {
                center: [45.0355, 38.9753],
                zoom: 11,
                controls: []
            }, {
                suppressMapOpenBlock: true,
                yandexMapDisablePoiInteractivity: true
            });
            
            miniPropertiesMapInstance.behaviors.disable(['drag', 'scrollZoom', 'dblClickZoom', 'multiTouch']);
            
            fetch('/api/mini-map/properties', {
                credentials: 'same-origin'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.coordinates && data.coordinates.length > 0) {
                        console.log(`✅ Loaded ${data.count} property coordinates`);
                        
                        const clusters = clusterCoordinates(data.coordinates, 0.01);
                        
                        // Создаем метки на карте
                        clusters.forEach(cluster => {
                            const placemark = new ymaps.Placemark([cluster.lat, cluster.lng], {
                                iconContent: cluster.count
                            }, {
                                preset: 'islands#blueCircleIcon',
                                iconColor: '#0088CC'
                            });
                            
                            placemark.events.add('click', function(e) {
                                e.stopPropagation();
                                handleMapClick();
                            });
                            
                            miniPropertiesMapInstance.geoObjects.add(placemark);
                        });
                        
                        console.log(`✅ Created ${clusters.length} clusters on Yandex mini map`);
                        
                        // 🎯 АВТОМАТИЧЕСКОЕ ЦЕНТРИРОВАНИЕ ПО ОБЪЕКТАМ
                        // Вычисляем границы по всем координатам
                        const bounds = data.coordinates.reduce((acc, coord) => {
                            if (!acc.minLat || coord.lat < acc.minLat) acc.minLat = coord.lat;
                            if (!acc.maxLat || coord.lat > acc.maxLat) acc.maxLat = coord.lat;
                            if (!acc.minLng || coord.lng < acc.minLng) acc.minLng = coord.lng;
                            if (!acc.maxLng || coord.lng > acc.maxLng) acc.maxLng = coord.lng;
                            return acc;
                        }, {});
                        
                        // Устанавливаем карту по границам объектов с небольшим отступом
                        miniPropertiesMapInstance.setBounds([
                            [bounds.minLat, bounds.minLng],
                            [bounds.maxLat, bounds.maxLng]
                        ], {
                            checkZoomRange: true,
                            zoomMargin: 20  // Отступ от краев в пикселях
                        });
                        
                        console.log(`🎯 Auto-centered map: [${bounds.minLat.toFixed(4)}, ${bounds.minLng.toFixed(4)}] - [${bounds.maxLat.toFixed(4)}, ${bounds.maxLng.toFixed(4)}]`);
                    }
                })
                .catch(error => {
                    console.error('❌ Error loading property coordinates:', error);
                });
            
            console.log('✅ Yandex mini map initialized for properties');
        } catch (error) {
            console.error('❌ Error initializing Yandex mini map:', error);
        }
    });
}

// Open fullscreen map modal (Mobile)
function openFullscreenMap() {
    const modal = document.getElementById('fullscreenMapModal');
    if (!modal) return;
    
    console.log('🗺️ Opening fullscreen map modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize map after modal is visible, store timeout to cancel if needed
    mapInitTimeout = setTimeout(() => {
        // Double-check modal is still open before initializing
        if (!modal.classList.contains('hidden')) {
            initFullscreenMap();
        }
        mapInitTimeout = null;
    }, 100);
}

// Group properties by coordinates
function groupPropertiesByCoords(properties) {
    const groups = {};
    
    properties.forEach(property => {
        // Check both formats: direct latitude/longitude and coordinates object
        const lat = property.latitude || (property.coordinates && property.coordinates.lat);
        const lng = property.longitude || (property.coordinates && property.coordinates.lng);
        
        if (lat && lng) {
            const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
            if (!groups[key]) {
                groups[key] = {
                    lat: lat,
                    lng: lng,
                    properties: []
                };
            }
            // Ensure property has coordinates in expected format for marker creation
            if (!property.coordinates) {
                property.coordinates = { lat: lat, lng: lng };
            }
            groups[key].properties.push(property);
        }
    });
    
    return Object.values(groups);
}

// Format price for display
function formatPrice(price) {
    if (!price) return 'По запросу';
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

// Create enhanced Yandex Maps marker - FIXED for sanitization warnings
function createEnhancedYandexMarker(properties) {
    const count = properties.length;
    const coords = [properties[0].coordinates.lat, properties[0].coordinates.lng];
    const minPrice = Math.min(...properties.map(p => p.price || Infinity).filter(p => p !== Infinity));
    const priceText = minPrice !== Infinity ? Math.round(minPrice / 1000000 * 10) / 10 + 'М' : '?';
    
    // Simplified icon layout WITHOUT inline events - prevents sanitization warnings
    const iconLayout = ymaps.templateLayoutFactory.createClass(
        '<div class="ymap-marker">' +
        '<div class="marker-inner">' +
        '<span class="marker-count">' + count + '</span>' +
        '<span class="marker-text">от ' + priceText + '₽</span>' +
        '</div>' +
        '</div>',
        {
            build: function() {
                iconLayout.superclass.build.call(this);
                const marker = this.getParentElement().querySelector('.ymap-marker');
                if (marker) {
                    marker.style.cssText = 'position: relative;';
                }
                const inner = this.getParentElement().querySelector('.marker-inner');
                if (inner) {
                    inner.style.cssText = 'background: linear-gradient(135deg, #006699, #0088CC); color: white; padding: 6px 12px; border-radius: 20px; box-shadow: 0 3px 10px rgba(0, 136, 204, 0.5); border: 2px solid white; font-size: 12px; font-weight: bold; white-space: nowrap; font-family: Inter, system-ui, sans-serif; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;';
                }
                const countElem = this.getParentElement().querySelector('.marker-count');
                if (countElem) {
                    countElem.style.cssText = 'background: rgba(255,255,255,0.25); border-radius: 50%; min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; padding: 0 4px;';
                }
            }
        }
    );
    
    // For mobile: use bottom sheet, for desktop: use balloon
    const placemark = new ymaps.Placemark(coords, {
        properties: properties,
        hintContent: `${count} ${count === 1 ? 'квартира' : 'квартир'}`
    }, {
        iconLayout: iconLayout,
        iconShape: {
            type: 'Rectangle',
            coordinates: [[-60, -20], [60, 20]]
        }
    });
    
    // Bind click event properly instead of inline handler
    placemark.events.add('click', function(e) {
        e.stopPropagation();
        if (isMobileDevice()) {
            // Mobile: Open bottom sheet
            openPropertyBottomSheet(properties);
        } else {
            // Desktop: Open balloon with property list
            placemark.balloon.open();
        }
    });
    
    // Set balloon content for desktop
    if (!isMobileDevice()) {
        const balloonContent = createYandexBalloonContent(properties);
        placemark.properties.set('balloonContent', balloonContent);
    }
    
    return placemark;
}

// Create balloon content for Yandex Maps (Desktop only - no onerror to avoid warnings)
function createYandexBalloonContent(properties) {
    if (properties.length === 1) {
        const property = properties[0];
        const price = formatPrice(property.price);
        const rooms = property.rooms || '?';
        const area = property.area || '?';
        const complex = property.residential_complex || property.complex_name || 'Жилой комплекс';
        const image = property.main_image || property.image || 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        const cashback = property.cashback_rate || 0;
        
        return `
            <div style="min-width: 280px; max-width: 320px; font-family: Inter, sans-serif;">
                <div style="position: relative; height: 120px; overflow: hidden; border-radius: 8px 8px 0 0;">
                    <img src="${image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${complex}">
                    ${cashback > 0 ? `<div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #FFB800, #FF8C00); color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(255,184,0,0.4);">Кешбек ${cashback}%</div>` : ''}
                </div>
                <div style="padding: 12px;">
                    <div style="font-weight: bold; font-size: 18px; color: #0088CC; margin-bottom: 8px;">${price}</div>
                    <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">${rooms === 0 ? 'Студия' : rooms + '-комн.'}, ${area} м²</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">${complex}</div>
                    <a href="${property.url || '/object/' + property.id}" style="display: block; background: linear-gradient(135deg, #0088CC, #006699); color: white; text-align: center; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 13px;">Подробнее</a>
                </div>
            </div>
        `;
    } else {
        const complex = properties[0].residential_complex || properties[0].complex_name || 'Жилой комплекс';
        const image = properties[0].main_image || properties[0].image || 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        const minPrice = Math.min(...properties.map(p => p.price || Infinity).filter(p => p !== Infinity));
        const maxPrice = Math.max(...properties.map(p => p.price || 0));
        const priceRange = minPrice !== Infinity ? formatPrice(minPrice) : 'По запросу';
        
        // Create scrollable property list
        let propertyList = '';
        properties.slice(0, 10).forEach(prop => {
            const price = formatPrice(prop.price);
            const rooms = prop.rooms || '?';
            const area = prop.area || '?';
            
            propertyList += `
                <div style="padding: 8px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 500; font-size: 12px; color: #1e293b;">${rooms === 0 ? 'Студия' : rooms + '-комн.'}, ${area} м²</div>
                        <div style="font-size: 11px; color: #64748b;">${prop.floor || '?'} этаж</div>
                    </div>
                    <div>
                        <div style="font-weight: bold; color: #0088CC; font-size: 12px;">${price}</div>
                        <a href="${prop.url || '/object/' + prop.id}" style="font-size: 10px; color: #0088CC; text-decoration: none;">Подробнее →</a>
                    </div>
                </div>
            `;
        });
        
        return `
            <div style="min-width: 300px; max-width: 350px; font-family: Inter, sans-serif;">
                <div style="position: relative; height: 120px; overflow: hidden;">
                    <img src="${image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${complex}">
                    <div style="position: absolute; top: 8px; right: 8px; background: linear-gradient(135deg, #FFB800, #FF8C00); color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(255,184,0,0.4);">${properties.length} квартир</div>
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); height: 50px;"></div>
                    <h3 style="position: absolute; bottom: 8px; left: 8px; color: white; font-weight: bold; font-size: 14px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${complex}</h3>
                </div>
                <div style="padding: 12px;">
                    <div style="font-weight: bold; font-size: 18px; color: #0088CC; margin-bottom: 8px;">от ${priceRange}</div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Разные планировки и этажи</div>
                    <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px;">
                        ${propertyList}
                    </div>
                    ${properties.length > 10 ? `<div style="text-align: center; font-size: 11px; color: #64748b;">Показано 10 из ${properties.length} квартир</div>` : ''}
                </div>
            </div>
        `;
    }
}

// Close fullscreen map modal
function closeFullscreenMap() {
    const modal = document.getElementById('fullscreenMapModal');
    if (!modal) return;
    
    console.log('🗺️ Closing fullscreen map modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // Cancel pending map initialization to prevent race condition
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
    if (fullscreenMapInstance) {
        fullscreenMapInstance.destroy();
        fullscreenMapInstance = null;
    }
}

// Initialize fullscreen map with ALL properties
function initFullscreenMap() {
    const modal = document.getElementById('fullscreenMapModal');
    const mapContainer = document.getElementById('fullscreenMapContainer');
    
    // Bail out if modal is closed or map already exists
    if (!modal || modal.classList.contains('hidden') || !mapContainer || fullscreenMapInstance) {
        console.log('🗺️ Skipping map init - modal closed or map exists');
        return;
    }
    
    if (typeof ymaps === 'undefined') {
        console.warn('ymaps not loaded yet, retrying in 500ms');
        ymapsRetryTimeout = setTimeout(initFullscreenMap, 500);
        return;
    }
    
    ymaps.ready(function() {
        try {
            console.log('🗺️ Initializing fullscreen Yandex Map');
            
            // Create map with controls
            fullscreenMapInstance = new ymaps.Map('fullscreenMapContainer', {
                center: [45.0355, 38.9753],
                zoom: 11,
                controls: ['zoomControl', 'geolocationControl']
            });
            
            // 🎯 STEP 1: Load all coordinates from mini-map endpoint
            fetch('/api/mini-map/properties', {
                credentials: 'same-origin'
            })
                .then(response => response.json())
                .then(coordsData => {
                    if (!coordsData.success || !coordsData.coordinates || coordsData.coordinates.length === 0) {
                        console.warn('⚠️ No coordinates loaded');
                        return;
                    }
                    
                    console.log(`✅ Loaded ${coordsData.count} coordinates from mini-map endpoint`);
                    
                    // 🎯 STEP 2: Load ALL property data by fetching all pages
                    const fetchAllProperties = async () => {
                        let allProperties = [];
                        let page = 1;
                        let totalPages = 1;
                        
                        do {
                            const response = await fetch(`/api/properties/list?per_page=500&page=${page}`);
                            const data = await response.json();
                            
                            if (!data.success || !data.properties) {
                                break;
                            }
                            
                            allProperties = allProperties.concat(data.properties);
                            totalPages = data.pagination?.pages || 1;
                            page++;
                            
                            console.log(`📥 Fetched page ${page-1}/${totalPages}, total so far: ${allProperties.length}`);
                        } while (page <= totalPages);
                        
                        return allProperties;
                    };
                    
                    // Execute the async function
                    return fetchAllProperties()
                        .then(allProperties => {
                            if (!allProperties || allProperties.length === 0) {
                                console.warn('⚠️ No properties loaded');
                                return;
                            }
                            
                            console.log(`✅ Loaded ${allProperties.length} full properties`);
                            
                            // Update counter
                            const counter = document.getElementById('mapObjectsCount');
                            if (counter) {
                                counter.textContent = allProperties.length;
                            }
                            
                            // Group properties by coordinates
                            const grouped = groupPropertiesByCoords(allProperties);
                            console.log(`📊 Grouped ${allProperties.length} properties into ${grouped.length} location groups`);
                            
                            // Create enhanced placemarks
                            grouped.forEach(group => {
                                try {
                                    const placemark = createEnhancedYandexMarker(group.properties);
                                    fullscreenMapInstance.geoObjects.add(placemark);
                                } catch (error) {
                                    console.error('❌ Error creating marker:', error, group);
                                }
                            });
                            
                            console.log(`✅ Created ${grouped.length} markers on fullscreen map`);
                            
                            // Auto-center map to show all properties
                            const coords = allProperties
                                .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
                                .map(p => p.coordinates);
                            
                            if (coords.length > 0) {
                                const bounds = coords.reduce((acc, coord) => {
                                    if (!acc.minLat || coord.lat < acc.minLat) acc.minLat = coord.lat;
                                    if (!acc.maxLat || coord.lat > acc.maxLat) acc.maxLat = coord.lat;
                                    if (!acc.minLng || coord.lng < acc.minLng) acc.minLng = coord.lng;
                                    if (!acc.maxLng || coord.lng > acc.maxLng) acc.maxLng = coord.lng;
                                    return acc;
                                }, {});
                                
                                fullscreenMapInstance.setBounds([
                                    [bounds.minLat, bounds.minLng],
                                    [bounds.maxLat, bounds.maxLng]
                                ], {
                                    checkZoomRange: true,
                                    zoomMargin: 40
                                });
                                
                                console.log(`🎯 Map centered on ${coords.length} properties`);
                            }
                        });
                })
                .catch(error => {
                    console.error('❌ Error loading properties for fullscreen map:', error);
                });
            
            console.log('✅ Fullscreen Yandex Map initialized');
        } catch (error) {
            console.error('❌ Error initializing fullscreen map:', error);
        }
    });
}

// Open property bottom sheet (Mobile)
function openPropertyBottomSheet(properties) {
    const bottomSheet = document.getElementById('propertyBottomSheet');
    const backdrop = document.getElementById('bottomSheetBackdrop');
    const container = document.getElementById('bottomSheetPropertiesContainer');
    
    if (!bottomSheet || !backdrop || !container) {
        console.warn('⚠️ Bottom sheet elements not found');
        return;
    }
    
    console.log(`🗺️ Opening bottom sheet with ${properties.length} properties`);
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create property cards
    properties.forEach((property, index) => {
        const card = createPropertyCard(property, index);
        container.appendChild(card);
    });
    
    // Show bottom sheet with animation
    backdrop.classList.remove('hidden');
    bottomSheet.classList.remove('hidden');
    
    // Trigger animation after a brief delay for smooth transition
    setTimeout(() => {
        backdrop.classList.add('active');
        bottomSheet.classList.add('active');
    }, 10);
}

// Close property bottom sheet
function closePropertyBottomSheet() {
    const bottomSheet = document.getElementById('propertyBottomSheet');
    const backdrop = document.getElementById('bottomSheetBackdrop');
    
    if (!bottomSheet || !backdrop) return;
    
    // Remove active classes to trigger close animation
    backdrop.classList.remove('active');
    bottomSheet.classList.remove('active');
    
    // Hide elements after animation completes
    setTimeout(() => {
        backdrop.classList.add('hidden');
        bottomSheet.classList.add('hidden');
    }, 300);
}

// Create property card for bottom sheet
function createPropertyCard(property, index) {
    const card = document.createElement('div');
    card.className = 'bottom-sheet-property-card bg-white rounded-xl shadow-md overflow-hidden';
    
    const price = formatPrice(property.price);
    const rooms = property.rooms !== undefined && property.rooms !== null ? property.rooms : (property.room_count !== undefined && property.room_count !== null ? property.room_count : null);
    const area = property.area || property.total_area || '?';
    const complex = property.residential_complex || property.complex_name || 'Жилой комплекс';
    const image = property.main_image || property.image || 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    const cashback = property.cashback_rate || 0;
    const propertyUrl = property.url || '/object/' + property.id;
    
    // Format rooms text - handle studios properly
    let roomsText = '?-комн.';
    if (rooms === 0 || rooms === '0') {
        roomsText = 'Студия';
    } else if (rooms !== null && rooms !== '?' && rooms !== '') {
        roomsText = rooms + '-комн.';
    }
    
    // Create image element and handle error via JavaScript (no inline onerror)
    const imgElement = document.createElement('img');
    imgElement.src = image;
    imgElement.alt = complex;
    imgElement.className = 'w-full h-32 object-cover';
    imgElement.addEventListener('error', function() {
        this.src = 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    });
    
    card.innerHTML = `
        <a href="${propertyUrl}" class="flex gap-3">
            <div class="relative w-32 flex-shrink-0">
                <div class="img-container"></div>
                ${cashback > 0 ? `
                    <div class="absolute top-1 left-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold shadow">
                        ${cashback}%
                    </div>
                ` : ''}
            </div>
            <div class="flex-1 py-2 pr-2">
                <div class="text-lg font-bold text-blue-600 mb-1">${price}</div>
                <div class="text-gray-700 text-sm font-medium mb-1">
                    ${roomsText}, ${area} м²
                </div>
                <div class="text-xs text-gray-500 mb-1">${complex}</div>
                <div class="text-xs text-gray-400">
                    ${property.floor ? `Этаж ${property.floor}` : ''}
                </div>
            </div>
        </a>
    `;
    
    // Insert image via JavaScript
    const imgContainer = card.querySelector('.img-container');
    if (imgContainer) {
        imgContainer.appendChild(imgElement);
    }
    
    return card;
}

// Handle map click - mobile opens modal, desktop goes to /map
function handleMapClick(event) {
    if (event) event.stopPropagation();
    
    if (isMobileDevice()) {
        openFullscreenMap();
    } else {
        window.location.href = '/map';
    }
}

// ESC key handler for modal
function handleEscKey(event) {
    if (event.key === 'Escape' || event.keyCode === 27) {
        const modal = document.getElementById('fullscreenMapModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeFullscreenMap();
        }
    }
}

// Add ESC key listener on load
document.addEventListener('keydown', handleEscKey);

// Make functions globally available
window.openFullscreenMap = openFullscreenMap;
window.closeFullscreenMap = closeFullscreenMap;
window.handleMapClick = handleMapClick;
window.closePropertyBottomSheet = closePropertyBottomSheet;

// Initialize mini map on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🗺️ Properties mini map - DOMContentLoaded');
        setTimeout(initMiniPropertiesMap, 500);
    });
} else {
    console.log('🗺️ Properties mini map - DOM already loaded');
    setTimeout(initMiniPropertiesMap, 500);
}

// ==================== MAP FILTERS FUNCTIONALITY ====================

// Filter state management
const mapFilters = {
    rooms: [],
    price_min: '',
    price_max: '',
    area_min: '',
    area_max: '',
    floor_min: '',
    floor_max: '',
    developers: [],
    completion: [],
    object_classes: []
};

// Debounce helper
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

// Toggle room filter chip
function toggleMapRoomFilter(room) {
    const index = mapFilters.rooms.indexOf(room);
    const chip = document.querySelector(`button[data-map-room-filter="${room}"]`);
    
    if (index > -1) {
        // Remove filter
        mapFilters.rooms.splice(index, 1);
        if (chip) {
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.add('border-gray-300');
        }
    } else {
        // Add filter
        mapFilters.rooms.push(room);
        if (chip) {
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.remove('border-gray-300');
        }
    }
    
    console.log('🗺️ Room filter toggled:', room, 'Current rooms:', mapFilters.rooms);
    updateMapWithFilters();
}

// Open advanced filters modal
function openMapAdvancedFilters() {
    const modal = document.getElementById('mapAdvancedFiltersModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('🗺️ Advanced filters modal opened');
    }
}

// Close advanced filters modal
function closeMapAdvancedFilters() {
    const modal = document.getElementById('mapAdvancedFiltersModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        console.log('🗺️ Advanced filters modal closed');
    }
}

// Toggle developers list (collapsible)
function toggleMapDevelopersList() {
    const list = document.getElementById('mapDevelopersList');
    const chevron = document.getElementById('mapDevelopersChevron');
    if (list && chevron) {
        list.classList.toggle('hidden');
        chevron.classList.toggle('rotate-180');
    }
}

// === TOOLBAR QUICK FILTERS ===

// Toggle room filter on toolbar
function toggleToolbarRoomFilter(room) {
    const index = mapFilters.rooms.indexOf(room);
    const chip = document.querySelector(`button[data-toolbar-room="${room}"]`);
    
    if (index > -1) {
        // Remove filter
        mapFilters.rooms.splice(index, 1);
        if (chip) {
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.add('border-gray-300');
        }
    } else {
        // Add filter
        mapFilters.rooms.push(room);
        if (chip) {
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.remove('border-gray-300');
        }
    }
    
    console.log('🗺️ Toolbar room filter toggled:', room, 'Current rooms:', mapFilters.rooms);
    
    // Sync with bottom sheet chips
    syncToolbarFiltersWithBottomSheet();
    
    // Update map badge counter
    updateMapFiltersBadge();
    
    // Update map immediately
    updateMapWithFilters();
}

// Sync toolbar filters with bottom sheet
function syncToolbarFiltersWithBottomSheet() {
    // Sync room chips in bottom sheet
    document.querySelectorAll('[data-quick-room]').forEach(chip => {
        const room = parseInt(chip.dataset.quickRoom);
        const toolbarChip = document.querySelector(`button[data-toolbar-room="${room}"]`);
        
        if (mapFilters.rooms.includes(room)) {
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.remove('border-gray-300');
            if (toolbarChip) {
                toolbarChip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
                toolbarChip.classList.remove('border-gray-300');
            }
        } else {
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.add('border-gray-300');
            if (toolbarChip) {
                toolbarChip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                toolbarChip.classList.add('border-gray-300');
            }
        }
    });
}

// === QUICK FILTERS BOTTOM SHEET ===

// Open quick filters bottom sheet
function openMapQuickFilters() {
    const backdrop = document.getElementById('mapQuickFiltersBackdrop');
    const sheet = document.getElementById('mapQuickFiltersSheet');
    
    if (backdrop && sheet) {
        // Show elements
        backdrop.classList.remove('hidden');
        sheet.classList.remove('hidden');
        
        // Trigger animations
        setTimeout(() => {
            backdrop.style.opacity = '1';
            sheet.style.transform = 'translateY(0)';
        }, 10);
        
        // Sync values from mapFilters to quick filters UI
        syncQuickFiltersFromState();
        
        console.log('🗺️ Quick filters bottom sheet opened');
    }
}

// Close quick filters bottom sheet
function closeMapQuickFilters() {
    const backdrop = document.getElementById('mapQuickFiltersBackdrop');
    const sheet = document.getElementById('mapQuickFiltersSheet');
    
    if (backdrop && sheet) {
        backdrop.style.opacity = '0';
        sheet.style.transform = 'translateY(100%)';
        
        setTimeout(() => {
            backdrop.classList.add('hidden');
            sheet.classList.add('hidden');
        }, 300);
        
        console.log('🗺️ Quick filters bottom sheet closed');
    }
}

// Toggle room filter in quick filters
function toggleQuickRoomFilter(room) {
    const index = mapFilters.rooms.indexOf(room);
    const chip = document.querySelector(`button[data-quick-room="${room}"]`);
    
    if (index > -1) {
        // Remove filter
        mapFilters.rooms.splice(index, 1);
        if (chip) {
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.add('border-gray-300');
        }
    } else {
        // Add filter
        mapFilters.rooms.push(room);
        if (chip) {
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.remove('border-gray-300');
        }
    }
    
    console.log('🗺️ Quick room filter toggled:', room, 'Current rooms:', mapFilters.rooms);
}

// Sync quick filters UI from current filter state
function syncQuickFiltersFromState() {
    // Sync room chips in bottom sheet AND toolbar
    document.querySelectorAll('[data-quick-room], [data-toolbar-room]').forEach(chip => {
        const room = parseInt(chip.dataset.quickRoom || chip.dataset.toolbarRoom);
        if (mapFilters.rooms.includes(room)) {
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.remove('border-gray-300');
        } else {
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            chip.classList.add('border-gray-300');
        }
    });
    
    // Sync price inputs
    const quickPriceFrom = document.getElementById('quickPriceFrom');
    const quickPriceTo = document.getElementById('quickPriceTo');
    if (quickPriceFrom) quickPriceFrom.value = mapFilters.price_min || '';
    if (quickPriceTo) quickPriceTo.value = mapFilters.price_max || '';
    
    // Sync area inputs
    const quickAreaFrom = document.getElementById('quickAreaFrom');
    const quickAreaTo = document.getElementById('quickAreaTo');
    if (quickAreaFrom) quickAreaFrom.value = mapFilters.area_min || '';
    if (quickAreaTo) quickAreaTo.value = mapFilters.area_max || '';
}

// Apply quick filters
function applyQuickFilters() {
    // Collect values from quick filter inputs
    mapFilters.price_min = document.getElementById('quickPriceFrom').value;
    mapFilters.price_max = document.getElementById('quickPriceTo').value;
    mapFilters.area_min = document.getElementById('quickAreaFrom').value;
    mapFilters.area_max = document.getElementById('quickAreaTo').value;
    
    console.log('🗺️ Applying quick filters:', mapFilters);
    
    // Update filters summary
    updateFiltersCount();
    
    // Update map badge counter
    updateMapFiltersBadge();
    
    // Close bottom sheet
    closeMapQuickFilters();
    
    // Update map with filters
    updateMapWithFilters();
}

// Reset quick filters
function resetQuickFilters() {
    // Clear rooms
    mapFilters.rooms = [];
    document.querySelectorAll('[data-quick-room], [data-toolbar-room]').forEach(chip => {
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        chip.classList.add('border-gray-300');
    });
    
    // Clear price
    mapFilters.price_min = '';
    mapFilters.price_max = '';
    const quickPriceFrom = document.getElementById('quickPriceFrom');
    const quickPriceTo = document.getElementById('quickPriceTo');
    if (quickPriceFrom) quickPriceFrom.value = '';
    if (quickPriceTo) quickPriceTo.value = '';
    
    // Clear area
    mapFilters.area_min = '';
    mapFilters.area_max = '';
    const quickAreaFrom = document.getElementById('quickAreaFrom');
    const quickAreaTo = document.getElementById('quickAreaTo');
    if (quickAreaFrom) quickAreaFrom.value = '';
    if (quickAreaTo) quickAreaTo.value = '';
    
    console.log('🗺️ Quick filters reset');
    
    // Update map
    updateMapWithFilters();
}

// Open advanced filters from quick filters bottom sheet
function openMapAdvancedFiltersFromQuick() {
    // Close quick filters
    closeMapQuickFilters();
    
    // Wait for animation, then open advanced
    setTimeout(() => {
        openMapAdvancedFilters();
    }, 350);
}

// Update active filters count display
function updateFiltersCount() {
    let count = 0;
    
    // Count active filters
    if (mapFilters.rooms.length > 0) count++;
    if (mapFilters.price_min || mapFilters.price_max) count++;
    if (mapFilters.area_min || mapFilters.area_max) count++;
    if (mapFilters.floor_min || mapFilters.floor_max) count++;
    if (mapFilters.developers.length > 0) count++;
    if (mapFilters.completion.length > 0) count++;
    if (mapFilters.object_classes.length > 0) count++;
    
    const summaryEl = document.getElementById('mapActiveFiltersSummary');
    const countEl = document.getElementById('mapActiveFiltersCount');
    
    if (count > 0) {
        if (summaryEl) summaryEl.classList.remove('hidden');
        if (countEl) countEl.textContent = `${count} ${count === 1 ? 'фильтр' : count < 5 ? 'фильтра' : 'фильтров'}`;
    } else {
        if (summaryEl) summaryEl.classList.add('hidden');
    }
}

// Reset advanced filters (called from "Сбросить" button in advanced filters modal)
function resetMapAdvancedFilters() {
    // Clear all advanced filter inputs
    document.getElementById('mapPriceFrom').value = '';
    document.getElementById('mapPriceTo').value = '';
    document.getElementById('mapAreaFrom').value = '';
    document.getElementById('mapAreaTo').value = '';
    document.getElementById('mapFloorFrom').value = '';
    document.getElementById('mapFloorTo').value = '';
    
    // Uncheck all checkboxes
    document.querySelectorAll('[data-map-filter="developer"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[data-map-filter="completion"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[data-map-filter="object_class"]').forEach(cb => cb.checked = false);
    
    // Clear filter state object - ALL filters including rooms
    Object.keys(mapFilters).forEach(key => {
        if (Array.isArray(mapFilters[key])) {
            mapFilters[key] = [];
        } else {
            mapFilters[key] = '';
        }
    });
    
    // Clear room chip styling
    document.querySelectorAll('.map-room-chip').forEach(chip => {
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        chip.classList.add('border-gray-300');
    });
    
    console.log('🗺️ All filters reset (advanced + rooms)');
    
    // Close modal and update map
    closeMapAdvancedFilters();
    updateMapWithFilters();
}

// Apply advanced filters
function applyMapAdvancedFilters() {
    // Collect filter values
    mapFilters.price_min = document.getElementById('mapPriceFrom').value;
    mapFilters.price_max = document.getElementById('mapPriceTo').value;
    mapFilters.area_min = document.getElementById('mapAreaFrom').value;
    mapFilters.area_max = document.getElementById('mapAreaTo').value;
    mapFilters.floor_min = document.getElementById('mapFloorFrom').value;
    mapFilters.floor_max = document.getElementById('mapFloorTo').value;
    
    // Collect checkbox values
    mapFilters.developers = Array.from(document.querySelectorAll('[data-map-filter="developer"]:checked')).map(cb => cb.value);
    mapFilters.completion = Array.from(document.querySelectorAll('[data-map-filter="completion"]:checked')).map(cb => cb.value);
    mapFilters.object_classes = Array.from(document.querySelectorAll('[data-map-filter="object_class"]:checked')).map(cb => cb.value);
    
    console.log('🗺️ Applying advanced filters:', mapFilters);
    
    // Update map badge counter
    updateMapFiltersBadge();
    
    // Close modal and update map
    closeMapAdvancedFilters();
    updateMapWithFilters();
}

// Reset all filters
function resetMapFilters() {
    // Reset filter state
    Object.keys(mapFilters).forEach(key => {
        if (Array.isArray(mapFilters[key])) {
            mapFilters[key] = [];
        } else {
            mapFilters[key] = '';
        }
    });
    
    // Reset quick filters UI
    document.querySelectorAll('[data-quick-room]').forEach(chip => {
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        chip.classList.add('border-gray-300');
    });
    
    const quickPriceFrom = document.getElementById('quickPriceFrom');
    const quickPriceTo = document.getElementById('quickPriceTo');
    const quickAreaFrom = document.getElementById('quickAreaFrom');
    const quickAreaTo = document.getElementById('quickAreaTo');
    
    if (quickPriceFrom) quickPriceFrom.value = '';
    if (quickPriceTo) quickPriceTo.value = '';
    if (quickAreaFrom) quickAreaFrom.value = '';
    if (quickAreaTo) quickAreaTo.value = '';
    
    // Reset advanced filters UI
    const mapPriceFrom = document.getElementById('mapPriceFrom');
    const mapPriceTo = document.getElementById('mapPriceTo');
    const mapAreaFrom = document.getElementById('mapAreaFrom');
    const mapAreaTo = document.getElementById('mapAreaTo');
    const mapFloorFrom = document.getElementById('mapFloorFrom');
    const mapFloorTo = document.getElementById('mapFloorTo');
    
    if (mapPriceFrom) mapPriceFrom.value = '';
    if (mapPriceTo) mapPriceTo.value = '';
    if (mapAreaFrom) mapAreaFrom.value = '';
    if (mapAreaTo) mapAreaTo.value = '';
    if (mapFloorFrom) mapFloorFrom.value = '';
    if (mapFloorTo) mapFloorTo.value = '';
    
    document.querySelectorAll('[data-map-filter="developer"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[data-map-filter="completion"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[data-map-filter="object_class"]').forEach(cb => cb.checked = false);
    
    // Update filters count
    updateFiltersCount();
    
    // Update map badge counter (reset to 0)
    updateMapFiltersBadge();
    
    console.log('🗺️ All filters reset');
    updateMapWithFilters();
}

// Update map with current filters
const updateMapWithFilters = debounce(async function() {
    if (!fullscreenMapInstance) {
        console.warn('⚠️ Map not initialized yet');
        return;
    }
    
    // Show loading indicator
    const loadingEl = document.getElementById('mapFilterLoading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    try {
        // Build query params from filters
        const params = new URLSearchParams();
        
        if (mapFilters.rooms.length > 0) {
            mapFilters.rooms.forEach(room => params.append('rooms', room));
        }
        if (mapFilters.price_min) params.append('price_min', parseFloat(mapFilters.price_min) * 1000000);
        if (mapFilters.price_max) params.append('price_max', parseFloat(mapFilters.price_max) * 1000000);
        if (mapFilters.area_min) params.append('area_min', mapFilters.area_min);
        if (mapFilters.area_max) params.append('area_max', mapFilters.area_max);
        if (mapFilters.floor_min) params.append('floor_min', mapFilters.floor_min);
        if (mapFilters.floor_max) params.append('floor_max', mapFilters.floor_max);
        
        if (mapFilters.developers.length > 0) {
            mapFilters.developers.forEach(dev => params.append('developers', dev));
        }
        if (mapFilters.completion.length > 0) {
            mapFilters.completion.forEach(year => params.append('completion', year));
        }
        if (mapFilters.object_classes.length > 0) {
            mapFilters.object_classes.forEach(cls => params.append('object_classes', cls));
        }
        
        console.log('🗺️ Fetching filtered properties:', params.toString());
        
        // Fetch ALL filtered properties (paginated)
        let allProperties = [];
        let page = 1;
        let totalPages = 1;
        
        do {
            const pageParams = new URLSearchParams(params);
            pageParams.append('per_page', '50');
            pageParams.append('page', page);
            
            const response = await fetch(`/api/properties/list?${pageParams.toString()}`);
            const data = await response.json();
            
            if (!data.success || !data.properties) {
                break;
            }
            
            allProperties = allProperties.concat(data.properties);
            totalPages = data.pagination?.pages || 1;
            page++;
            
            console.log(`📥 Fetched filtered page ${page-1}/${totalPages}, total: ${allProperties.length}`);
        } while (page <= totalPages);
        
        console.log(`✅ Loaded ${allProperties.length} filtered properties`);
        
        // Clear existing markers
        fullscreenMapInstance.geoObjects.removeAll();
        
        // Update counter
        const counter = document.getElementById('mapObjectsCount');
        if (counter) {
            counter.textContent = allProperties.length;
        }
        
        if (allProperties.length > 0) {
            // Group properties by coordinates
            const grouped = groupPropertiesByCoords(allProperties);
            console.log(`📊 Grouped ${allProperties.length} properties into ${grouped.length} location groups`);
            
            // Create new markers
            grouped.forEach(group => {
                try {
                    const placemark = createEnhancedYandexMarker(group.properties);
                    fullscreenMapInstance.geoObjects.add(placemark);
                } catch (error) {
                    console.error('❌ Error creating marker:', error, group);
                }
            });
            
            console.log(`✅ Created ${grouped.length} markers on filtered map`);
            
            // Auto-center map to show all filtered properties
            const coords = allProperties
                .filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng)
                .map(p => p.coordinates);
            
            if (coords.length > 0) {
                const bounds = coords.reduce((acc, coord) => {
                    if (!acc.minLat || coord.lat < acc.minLat) acc.minLat = coord.lat;
                    if (!acc.maxLat || coord.lat > acc.maxLat) acc.maxLat = coord.lat;
                    if (!acc.minLng || coord.lng < acc.minLng) acc.minLng = coord.lng;
                    if (!acc.maxLng || coord.lng > acc.maxLng) acc.maxLng = coord.lng;
                    return acc;
                }, {});
                
                fullscreenMapInstance.setBounds([
                    [bounds.minLat, bounds.minLng],
                    [bounds.maxLat, bounds.maxLng]
                ], {
                    checkZoomRange: true,
                    zoomMargin: 40
                });
                
                console.log(`🎯 Map centered on ${coords.length} filtered properties`);
            }
        }
        
        // Update active filters display
        updateActiveFiltersDisplay();
        
        // Show/hide reset button
        const hasFilters = mapFilters.rooms.length > 0 || 
                          mapFilters.price_min || mapFilters.price_max ||
                          mapFilters.area_min || mapFilters.area_max ||
                          mapFilters.floor_min || mapFilters.floor_max ||
                          mapFilters.developers.length > 0 ||
                          mapFilters.completion.length > 0 ||
                          mapFilters.object_classes.length > 0;
        
        const resetBtn = document.getElementById('mapResetFiltersBtn');
        if (resetBtn) {
            if (hasFilters) {
                resetBtn.classList.remove('hidden');
            } else {
                resetBtn.classList.add('hidden');
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating map with filters:', error);
    } finally {
        // Hide loading indicator
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}, 500); // 500ms debounce

// Update active filters display
function updateActiveFiltersDisplay() {
    const container = document.getElementById('mapActiveFilters');
    if (!container) return;
    
    const pills = [];
    
    // Room filters
    if (mapFilters.rooms.length > 0) {
        const roomLabels = mapFilters.rooms.map(r => {
            if (r === 0) return 'Студия';
            if (r === 4) return '4+комн';
            return `${r}-комн`;
        });
        pills.push(`<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Комнат: ${roomLabels.join(', ')}
        </span>`);
    }
    
    // Price filter
    if (mapFilters.price_min || mapFilters.price_max) {
        const priceText = [];
        if (mapFilters.price_min) priceText.push(`от ${mapFilters.price_min}М`);
        if (mapFilters.price_max) priceText.push(`до ${mapFilters.price_max}М`);
        pills.push(`<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            ${priceText.join(' ')}
        </span>`);
    }
    
    // Area filter
    if (mapFilters.area_min || mapFilters.area_max) {
        const areaText = [];
        if (mapFilters.area_min) areaText.push(`от ${mapFilters.area_min}м²`);
        if (mapFilters.area_max) areaText.push(`до ${mapFilters.area_max}м²`);
        pills.push(`<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            ${areaText.join(' ')}
        </span>`);
    }
    
    // Developers filter
    if (mapFilters.developers.length > 0) {
        pills.push(`<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Застройщиков: ${mapFilters.developers.length}
        </span>`);
    }
    
    // Completion filter
    if (mapFilters.completion.length > 0) {
        pills.push(`<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Сдача: ${mapFilters.completion.join(', ')}
        </span>`);
    }
    
    if (pills.length > 0) {
        container.innerHTML = pills.join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Update map filters badge counter
function updateMapFiltersBadge() {
    const counterMap = document.getElementById('advancedFiltersCounterMap');
    
    let count = 0;
    
    // Count selected rooms
    count += mapFilters.rooms.length;
    
    // Count price filter (if either min or max is set)
    if (mapFilters.price_min || mapFilters.price_max) {
        count++;
    }
    
    // Count area filter (if either min or max is set)
    if (mapFilters.area_min || mapFilters.area_max) {
        count++;
    }
    
    // Count developers
    count += mapFilters.developers.length;
    
    // Count completion filters
    count += mapFilters.completion.length;
    
    // Update badge
    if (counterMap) {
        if (count > 0) {
            counterMap.textContent = count;
            counterMap.classList.remove('hidden');
        } else {
            counterMap.classList.add('hidden');
        }
    }
    
    console.log(`📊 Map filters count: ${count} (rooms: ${mapFilters.rooms.length}, price: ${mapFilters.price_min || mapFilters.price_max ? 1 : 0}, developers: ${mapFilters.developers.length})`);
}

// Make filter functions globally available
window.toggleMapRoomFilter = toggleMapRoomFilter;
window.openMapAdvancedFilters = openMapAdvancedFilters;
window.closeMapAdvancedFilters = closeMapAdvancedFilters;
window.resetMapAdvancedFilters = resetMapAdvancedFilters;
window.applyMapAdvancedFilters = applyMapAdvancedFilters;
window.resetMapFilters = resetMapFilters;
window.toggleToolbarRoomFilter = toggleToolbarRoomFilter;
window.updateMapFiltersBadge = updateMapFiltersBadge;

console.log('✅ Map filters module loaded');
