/* ==========================================================================
   SatGuessr - Core JavaScript Logic
   Includes: Leaflet Map Management, Game States, Timer, Web Audio Sound Synthesizer,
             Score Calculation, and Dynamic UI Updates.
   ========================================================================== */

// Game Constants
const TOTAL_ROUNDS = 5;
const ROUND_TIME_LIMIT = 45;
const DECAY_CONSTANT = 2000; // Controls score distance sensitivity (lower is harder)

// Game State variables
let selectedCities = [];
let currentRound = 0; // 1-indexed
let totalScore = 0;
let timeRemaining = ROUND_TIME_LIMIT;
let timerInterval = null;
let currentCity = null;

// Maps and markers
let satMap = null;
let guessMap = null;
let recapMap = null;

let guessMarker = null;
let satTargetMarker = null;
let resultPolyline = null;

// Track player history
let roundResults = []; // Stores { round, city, guessLatLng, targetLatLng, distance, score }

// Audio Context for Web Synthesized Sounds
let audioCtx = null;

// Famous cities custom fun facts dictionary
const FAMOUS_CITY_FACTS = {
    "tokyo": "Tokyo is the world's most populous metropolitan area. Its satellite view reveals the vast sprawl of the Kanto Plain and the distinct green circular void of the Imperial Palace at its center.",
    "jakarta": "Jakarta is situated on the northwest coast of Java. The satellite view shows massive harbor facilities and a highly dense urban grid prone to rapid subsidence.",
    "delhi": "Delhi is one of the oldest continuously inhabited cities in the world. The satellite view highlights the contrast between the organic, packed streets of Old Delhi and the wide, green avenues of New Delhi designed by Edwin Lutyens.",
    "são paulo": "São Paulo is the largest city in the Americas. From above, it looks like an endless forest of concrete skyscrapers, bordered by lush green hills to the north.",
    "mexico city": "Mexico City was built on the ruins of the Aztec capital, Tenochtitlan, which was an island in Lake Texcoco. The lake basin is now dry, and the city's grid shows the perfectly flat valley surrounded by mountains.",
    "cairo": "Cairo, Egypt's capital, sits on the Nile River. Just southwest of the urban border, the three Great Pyramids of Giza cast long shadows across the sandy desert dunes.",
    "mumbai": "Mumbai is built on what was once an archipelago of seven islands. The satellite map shows a highly elongated peninsula jutting into the Arabian Sea, with the massive green expanse of Sanjay Gandhi National Park in its center.",
    "beijing": "Beijing's city plan features concentric ring roads centered around the ancient, rectangular, orange-roofed complex of the Forbidden City.",
    "dhaka": "Dhaka is the capital of Bangladesh, situated by the Buriganga River. It is known as the 'City of Mosques' and exhibits one of the highest population densities on Earth.",
    "osaka": "Osaka is famous for its port and modern architecture. In the satellite view, the moat-ringed park of Osaka Castle stands out as a green island amidst the urban density.",
    "new york": "New York City's Manhattan is one of the most recognizable grids in the world, dominated by the long rectangular green block of Central Park and flanked by the Hudson and East Rivers.",
    "london": "London is defined by the winding snake-like path of the River Thames. Major green parks like Hyde Park and Regent's Park are visible as dark green patches in the center.",
    "paris": "Paris features a unique radial street layout, planned by Baron Haussmann in the 19th century, with avenues branching out from the Arc de Triomphe like spokes on a wheel.",
    "sydney": "Sydney is built around Port Jackson (Sydney Harbour). From the satellite view, you can clearly spot the jagged coastline, the Sydney Harbour Bridge, and the white sails of the Sydney Opera House.",
    "rio de janeiro": "Rio de Janeiro boasts one of the most spectacular natural settings. The satellite view shows steep, jungle-covered mountains (like Sugarloaf and Corcovado) dropping straight into the blue Guanabara Bay and Atlantic beaches.",
    "cape town": "Cape Town sits at the southern tip of Africa. The massive flat-topped silhouette of Table Mountain casts a colossal shadow across the city bowl and the harbor.",
    "dubai": "Dubai is globally famous for its massive land reclamation projects. From space, the palm-tree shape of Palm Jumeirah and the map-like layout of the World Islands are unmistakable.",
    "rome": "Rome, the Eternal City, is situated along the Tiber River. The circular ruins of the Colosseum and the vast circular piazza of Vatican City are distinct landmarks from above.",
    "venice": "Venice is built on 118 small islands separated by canals and linked by over 400 bridges. The entire city looks like a floating fish divided by the S-shaped Grand Canal.",
    "moscow": "Moscow's radial-ring plan is centered on the historic Kremlin fortress and the colorful onion domes of Saint Basil's Cathedral next to the Moscow River.",
    "istanbul": "Istanbul straddles the Bosphorus Strait, which separates Europe and Asia. The satellite map highlights this busy shipping lane connecting the Black Sea to the Sea of Marmara.",
    "singapore": "Singapore is a tropical island city-state. Its southern coast is filled with hundreds of container ships waiting at one of the busiest maritime ports in the world.",
    "san francisco": "San Francisco lies on a hilly peninsula. The satellite view clearly outlines the Golden Gate Bridge connecting to the headlands, and the strict grid overlaying steep coastal topography.",
    "barcelona": "Barcelona is famous for its Eixample district, a grid designed by Ildefons Cerdà featuring octagonal city blocks with chamfered corners, allowing light and air to fill the streets.",
    "amsterdam": "Amsterdam is famous for its semi-circular concentric canal rings, built during the Dutch Golden Age, wrapping around the historic city center.",
    "chicago": "Chicago sits on the southwestern shore of Lake Michigan. The satellite view shows the Chicago River snaking through the Loop and the endless flat grid extending into the midwest.",
    "buenos aires": "Buenos Aires sits on the massive brown silt-laden estuary of the Río de la Plata. The city is designed with a dense grid and features a long modern dockland system (Puerto Madero).",
    "toronto": "Toronto sits on Lake Ontario. The long shadow of the CN Tower is visible stretching across the downtown grid, while the Toronto Islands shelter the inner harbor.",
    "los angeles": "Los Angeles is a sprawling grid covering a massive basin, bordered by the Pacific Ocean and the dry San Gabriel Mountains, frequently crossed by wide multi-lane freeways.",
    "madrid": "Madrid is located on the high Manzanares plateau in the center of the Iberian Peninsula. The satellite view shows a dense medieval core flanked by the large green park of El Retiro.",
    "seoul": "Seoul is split in half by the wide Han River. The satellite view highlights the surrounding granite mountains, with high-rise residential blocks clustered along the riverbanks.",
    "bangkok": "Bangkok is situated in the delta of the Chao Phraya River. The satellite view shows a winding river, dense canals (khlongs), and vibrant high-rises intermixed with golden temple rooftops.",
    "hong kong": "Hong Kong features extreme urban density clustered on the narrow strip of land between Victoria Peak and the deep harbor, crowded with skyscrapers.",
    "vancouver": "Vancouver is nestled between the Pacific Ocean and the snow-capped Coast Mountains. The dark green forest of Stanley Park stands out on the peninsula next to downtown.",
    "berlin": "Berlin's flat landscape is dotted with lakes and crossed by the Spree River. Large parks like the Tiergarten form green islands in the center of the German capital."
};

// ================= Sound Effects Generator =================
class Sounds {
    static init() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    static playTick() {
        this.init();
        if (!audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch tick
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
    }

    static playWarning() {
        this.init();
        if (!audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    }

    static playResult(score, maxScore) {
        this.init();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const ratio = score / maxScore;

        if (ratio > 0.8) {
            // Excellent score: Major arpeggio chime (C4 -> E4 -> G4 -> C5)
            this.playTone(261.63, 0.1, now);
            this.playTone(329.63, 0.1, now + 0.1);
            this.playTone(392.00, 0.1, now + 0.2);
            this.playTone(523.25, 0.3, now + 0.3);
        } else if (ratio > 0.4) {
            // Good/Okay score: Perfect fifth (C4 -> G4)
            this.playTone(261.63, 0.15, now);
            this.playTone(392.00, 0.3, now + 0.1);
        } else if (ratio > 0) {
            // Poor score: Single low tone
            this.playTone(196.00, 0.4, now);
        } else {
            // 0 points: Sad minor third (Eb4 -> C4)
            this.playTone(311.13, 0.2, now);
            this.playTone(261.63, 0.4, now + 0.15);
        }
    }

    static playTone(freq, duration, time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);
        
        osc.start(time);
        osc.stop(time + duration);
    }
}

// ================= Game Initialization & Navigation =================

document.addEventListener('DOMContentLoaded', () => {
    // Start button
    document.getElementById('start-btn').addEventListener('click', startGame);
    
    // Guess button
    document.getElementById('guess-btn').addEventListener('click', submitGuess);
    
    // Map expand toggle
    document.getElementById('expand-map-btn').addEventListener('click', toggleMapSize);
    
    // Next round button
    document.getElementById('next-round-btn').addEventListener('click', nextRound);
    
    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', restartGame);
});

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Select 5 random cities from the DB
function selectRandomCities() {
    const shuffled = [...CITIES_DB].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, TOTAL_ROUNDS);
}

function startGame() {
    Sounds.init(); // Initialize audio context on user interaction
    
    selectedCities = selectRandomCities();
    currentRound = 0;
    totalScore = 0;
    roundResults = [];
    
    document.getElementById('total-score').innerText = '0';
    
    switchScreen('game-screen');
    
    // Initialize Leaflet maps if not done already
    initGameMaps();
    
    startNewRound();
}

// ================= Mapping Management =================

function initGameMaps() {
    // 1. Satellite Map (Main viewport)
    if (!satMap) {
        satMap = L.map('sat-map', {
            zoomControl: false, // Hide zoom control to place it custom or keep screen clean
            attributionControl: false // Hide leaflet logo
        });
        
        // Add Esri World Imagery (pure satellite)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16,
            minZoom: 10
        }).addTo(satMap);
    }
    
    // 2. Guess Map (Corner inset)
    if (!guessMap) {
        guessMap = L.map('guess-map', {
            zoomControl: true,
            minZoom: 1,
            maxZoom: 8
        }).setView([20, 0], 1); // Centered globally
        
        // Add CartoDB Positron (clean, labels visible for placing pins)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 8
        }).addTo(guessMap);
        
        // Marker icons
        const guessIcon = L.divIcon({
            className: 'guess-marker',
            html: '<div class="marker-pin"></div>',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        });
        
        // Map click event
        guessMap.on('click', (e) => {
            const latlng = e.latlng;
            
            if (guessMarker) {
                guessMarker.setLatLng(latlng);
            } else {
                guessMarker = L.marker(latlng, { icon: guessIcon }).addTo(guessMap);
            }
            
            // Enable the guess button
            const guessBtn = document.getElementById('guess-btn');
            guessBtn.disabled = false;
            guessBtn.innerText = 'Guess!';
        });
    }
}

function resetMapStates() {
    // Clear guess marker
    if (guessMarker) {
        guessMap.removeLayer(guessMarker);
        guessMarker = null;
    }
    
    // Clear target markers or line if existing
    if (satTargetMarker) {
        satMap.removeLayer(satTargetMarker);
        satTargetMarker = null;
    }
    
    if (resultPolyline) {
        guessMap.removeLayer(resultPolyline);
        resultPolyline = null;
    }
    
    // Reset guess map view to global
    guessMap.setView([20, 0], 1);
    
    // Reset guess button
    const guessBtn = document.getElementById('guess-btn');
    guessBtn.disabled = true;
    guessBtn.innerText = 'Place Pin to Guess';
    
    // Collapse guess map if expanded
    document.getElementById('guess-map-container').classList.add('collapsed');
    document.getElementById('guess-map-container').classList.remove('expanded');
}

function toggleMapSize(e) {
    e.stopPropagation();
    const container = document.getElementById('guess-map-container');
    container.classList.toggle('expanded');
    
    // Invalidate map size after transition finishes to prevent rendering bugs
    setTimeout(() => {
        guessMap.invalidateSize();
    }, 300);
}

// ================= Round Game Loop =================

function startNewRound() {
    currentRound++;
    document.getElementById('current-round').innerText = `${currentRound} / 5`;
    
    // Retrieve current target city
    currentCity = selectedCities[currentRound - 1];
    
    // Reset maps
    resetMapStates();
    
    // Setup Satellite Map centered on target city
    const targetLatLng = [currentCity.lat, currentCity.lng];
    
    // Position satellite map at random zoom level between 12 and 14 for variation
    const initialZoom = Math.floor(Math.random() * 3) + 12; // 12, 13, or 14
    satMap.setView(targetLatLng, initialZoom);
    
    // Restrict panning bounds to keep them tightly within the city center (~2.2 km boundary)
    const boundsOffset = 0.02; // roughly 2.2km
    const bounds = L.latLngBounds(
        [currentCity.lat - boundsOffset, currentCity.lng - boundsOffset],
        [currentCity.lat + boundsOffset, currentCity.lng + boundsOffset]
    );
    satMap.setMaxBounds(bounds);
    satMap.setMinZoom(12); // Prevent zooming out too far to see surrounding geography
    satMap.setMaxZoom(16);
    
    // Trigger map invalidation to make sure dimensions render properly
    setTimeout(() => {
        satMap.invalidateSize();
    }, 100);
    
    // Start Countdown Timer
    startTimer();
}

// Timer Logic
function startTimer() {
    clearInterval(timerInterval);
    timeRemaining = ROUND_TIME_LIMIT;
    updateTimerUI();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerUI();
        
        // Ticking audio cues
        if (timeRemaining <= 5 && timeRemaining > 0) {
            Sounds.playTick();
        } else if (timeRemaining <= 10 && timeRemaining > 5) {
            // Soft warning blip
            Sounds.playTick();
        }
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            Sounds.playWarning();
            handleTimeOut();
        }
    }, 1000);
}

function updateTimerUI() {
    const timerText = document.getElementById('timer-text');
    const timerCircle = document.getElementById('timer-bar');
    
    timerText.innerText = timeRemaining;
    
    // Dash Offset calculation for countdown
    // Circle perimeter is 2 * Math.PI * 18 = 113.1
    const offset = 113.1 * (1 - timeRemaining / ROUND_TIME_LIMIT);
    timerCircle.style.strokeDashoffset = offset;
    
    // Style adjustments for warning zone
    if (timeRemaining <= 10) {
        timerCircle.classList.add('warning');
        timerText.style.color = '#ef4444';
    } else {
        timerCircle.classList.remove('warning');
        timerText.style.color = 'var(--text-main)';
    }
}

function handleTimeOut() {
    // If time ran out, force-submit guess.
    // If no pin is placed, they get 0 points.
    if (!guessMarker) {
        // Create dummy marker at antipode or very far away to guarantee 0 score
        // We will pass null coordinate to draw a specialized 0 result
        submitGuessWithCoords(null);
    } else {
        submitGuess();
    }
}

// ================= Scoring & Evaluation =================

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calculate score using exponential decay
function calculateScore(distanceKm) {
    if (distanceKm === null) return 0;
    
    // Max points is 5000. Under 20m is perfect score.
    if (distanceKm < 0.02) return 5000;
    
    // Exponential formula
    let score = 5000 * Math.exp(-distanceKm / DECAY_CONSTANT);
    score = Math.round(score);
    
    return Math.max(0, score);
}

function getRank(score) {
    if (score >= 26000) return "Master Cartographer";
    if (score >= 20000) return "Global Explorer";
    if (score >= 12000) return "Urban Adventurer";
    if (score >= 5000) return "Lost Tourist";
    return "Space Cadet";
}

function submitGuess() {
    clearInterval(timerInterval);
    if (!guessMarker) return;
    
    const guessLatLng = guessMarker.getLatLng();
    submitGuessWithCoords(guessLatLng);
}

function submitGuessWithCoords(guessLatLng) {
    clearInterval(timerInterval);
    
    const targetLatLng = L.latLng(currentCity.lat, currentCity.lng);
    let distance = null;
    let baseScore = 0;
    
    if (guessLatLng) {
        distance = calculateDistance(guessLatLng.lat, guessLatLng.lng, targetLatLng.lat, targetLatLng.lng);
        baseScore = calculateScore(distance);
    } else {
        distance = null; // Time ran out with no guess
        baseScore = 0;
    }
    
    // Round 5 counts double
    const isRound5 = (currentRound === TOTAL_ROUNDS);
    const finalScore = isRound5 ? baseScore * 2 : baseScore;
    
    totalScore += finalScore;
    
    // Store result
    roundResults.push({
        round: currentRound,
        city: currentCity,
        guessLatLng: guessLatLng,
        targetLatLng: targetLatLng,
        distance: distance,
        score: finalScore,
        isDouble: isRound5
    });
    
    // Play chime sound
    Sounds.playResult(finalScore, isRound5 ? 10000 : 5000);
    
    // Show Feedback Modal
    showFeedbackModal(guessLatLng, targetLatLng, distance, finalScore, isRound5);
}

// ================= UI Renderers =================

function showFeedbackModal(guessLatLng, targetLatLng, distance, score, isRound5) {
    const modal = document.getElementById('result-overlay');
    
    // Set text elements
    const distanceText = document.getElementById('result-distance');
    if (distance !== null) {
        distanceText.innerText = distance < 1 ? `${Math.round(distance * 1000)} m` : `${Math.round(distance).toLocaleString()} km`;
    } else {
        distanceText.innerText = "Time's Up! No Guess";
    }
    
    document.getElementById('result-score').innerText = `+${score.toLocaleString()}`;
    
    // Multiplier badge for round 5
    const badge = document.getElementById('multiplier-badge');
    if (isRound5) {
        badge.classList.remove('hide');
    } else {
        badge.classList.add('hide');
    }
    
    // City Info
    document.getElementById('city-name-header').innerText = `${currentCity.name}, ${currentCity.country}`;
    
    // Population details formatting
    let popFormatted = "Unknown";
    if (currentCity.population) {
        if (currentCity.population >= 1000000) {
            popFormatted = `${(currentCity.population / 1000000).toFixed(1)}M`;
        } else {
            popFormatted = currentCity.population.toLocaleString();
        }
    }
    document.getElementById('city-population').innerText = popFormatted;
    document.getElementById('city-coordinates').innerText = `${currentCity.lat.toFixed(2)}°, ${currentCity.lng.toFixed(2)}°`;
    
    // Fun fact selection
    const factKey = currentCity.name.toLowerCase();
    let funFact = FAMOUS_CITY_FACTS[factKey] || `This major metropolitan area has a population of ${popFormatted} and is situated in ${currentCity.country} at coordinates ${currentCity.lat.toFixed(2)}° lat, ${currentCity.lng.toFixed(2)}° lng.`;
    document.getElementById('city-fun-fact').innerText = funFact;
    
    // Setup modal map drawings
    showResultOnMaps(guessLatLng, targetLatLng);
    
    // Next button adjustments
    const nextBtn = document.getElementById('next-round-btn');
    if (currentRound === TOTAL_ROUNDS) {
        nextBtn.innerText = "View Final Summary";
    } else {
        nextBtn.innerText = "Next Round";
    }
    
    modal.classList.add('active');
}

function showResultOnMaps(guessLatLng, targetLatLng) {
    // 1. Show target pin on satellite map so player can see exactly where it was
    const targetIcon = L.divIcon({
        className: 'guess-marker target-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
    
    satTargetMarker = L.marker(targetLatLng, { icon: targetIcon }).addTo(satMap);
    satMap.setView(targetLatLng, 13); // Zoom slightly out to show target and city layout
    
    // Remove drag bounds temporarily so they can pan out
    satMap.setMaxBounds(null);
    
    // 2. Show target, guess, and connecting line on the guess map
    if (guessLatLng) {
        // Add target marker to guess map
        const targetGuessMapMarker = L.marker(targetLatLng, { icon: targetIcon }).addTo(guessMap);
        
        // Draw red dashed line between them
        resultPolyline = L.polyline([guessLatLng, targetLatLng], {
            color: '#ef4444',
            weight: 3,
            dashArray: '6, 8',
            opacity: 0.8
        }).addTo(guessMap);
        
        // Fit guess map bounds to contain both markers with padding
        const bounds = L.latLngBounds([guessLatLng, targetLatLng]);
        guessMap.fitBounds(bounds, { padding: [50, 50] });
        
        // Auto-remove targetGuessMapMarker when results are reset
        guessMap.on('zoomstart', function cleanUp() {
            // Keep it until resetMapStates handles it
        });
        
        // Quick trick to clean up extra target markers on guess map later:
        // We will let resetMapStates clear all layers except the tiles
        const originalReset = resetMapStates;
        resetMapStates = function() {
            guessMap.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                    guessMap.removeLayer(layer);
                }
            });
            originalReset();
            resetMapStates = originalReset; // restore
        };
    } else {
        // If time's up, just show target pin on guess map
        L.marker(targetLatLng, { icon: targetIcon }).addTo(guessMap);
        guessMap.setView(targetLatLng, 4);
    }
}

function nextRound() {
    document.getElementById('result-overlay').classList.remove('active');
    
    if (currentRound < TOTAL_ROUNDS) {
        startNewRound();
    } else {
        showGameOverScreen();
    }
}

// ================= Game Over Recap =================

function showGameOverScreen() {
    switchScreen('game-over-screen');
    
    // Update text
    document.getElementById('final-score').innerText = totalScore.toLocaleString();
    
    const rank = getRank(totalScore);
    document.getElementById('rank-badge').innerText = rank;
    
    // Populate recap table
    const tableBody = document.getElementById('recap-table-body');
    tableBody.innerHTML = '';
    
    roundResults.forEach(res => {
        const row = document.createElement('tr');
        
        const rdCell = document.createElement('td');
        rdCell.innerText = `R${res.round}${res.isDouble ? ' (2x)' : ''}`;
        row.appendChild(rdCell);
        
        const cityCell = document.createElement('td');
        cityCell.innerText = `${res.city.name}, ${res.city.country}`;
        row.appendChild(cityCell);
        
        const distCell = document.createElement('td');
        if (res.distance !== null) {
            distCell.innerText = res.distance < 1 ? `${Math.round(res.distance * 1000)} m` : `${Math.round(res.distance).toLocaleString()} km`;
        } else {
            distCell.innerText = "Time's Up";
        }
        row.appendChild(distCell);
        
        const scoreCell = document.createElement('td');
        scoreCell.innerText = res.score.toLocaleString();
        row.appendChild(scoreCell);
        
        tableBody.appendChild(row);
    });
    
    // Initialize Game Over Recap Map
    initRecapMap();
}

function initRecapMap() {
    // If map already exists, clear all overlays
    if (recapMap) {
        recapMap.remove();
        recapMap = null;
    }
    
    recapMap = L.map('recap-map', {
        zoomControl: true,
        attributionControl: false
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 9
    }).addTo(recapMap);
    
    const targetIcon = L.divIcon({
        className: 'guess-marker target-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [20, 28],
        iconAnchor: [10, 28]
    });
    
    const guessIcon = L.divIcon({
        className: 'guess-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [20, 28],
        iconAnchor: [10, 28]
    });
    
    const allCoords = [];
    
    roundResults.forEach(res => {
        // Add Target Marker
        L.marker(res.targetLatLng, { icon: targetIcon })
            .addTo(recapMap)
            .bindPopup(`<strong>Target:</strong> ${res.city.name}, ${res.city.country}`);
            
        allCoords.push(res.targetLatLng);
        
        // Add Guess Marker & Line
        if (res.guessLatLng) {
            L.marker(res.guessLatLng, { icon: guessIcon })
                .addTo(recapMap)
                .bindPopup(`<strong>Your Guess R${res.round}:</strong> ${res.score} pts`);
                
            allCoords.push(res.guessLatLng);
            
            L.polyline([res.guessLatLng, res.targetLatLng], {
                color: '#a855f7',
                weight: 2,
                dashArray: '4, 4',
                opacity: 0.7
            }).addTo(recapMap);
        }
    });
    
    // Fit map bounds to contain all coordinates
    if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        recapMap.fitBounds(bounds, { padding: [30, 30] });
    } else {
        recapMap.setView([20, 0], 1);
    }
}

function restartGame() {
    switchScreen('start-screen');
}
