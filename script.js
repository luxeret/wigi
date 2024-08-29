let map;

map = L.map('map', {
    center: [35.9078, 127.7669],
    zoom: 7,
    minZoom: 6
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

map.zoomControl.setPosition('bottomright');

const markers = [];
const markerCounts = { crime: 0, disaster: 0, protest: 0 };

function updateLegend() {
    document.getElementById('crime-count').textContent = `(${markerCounts.crime}건)`;
    document.getElementById('disaster-count').textContent = `(${markerCounts.disaster}건)`;
    document.getElementById('protest-count').textContent = `(${markerCounts.protest}건)`;
}

function filterMarkers() {
    const filterValue = document.getElementById('filter-select').value;
    const searchText = document.getElementById('search-bar').value.toLowerCase();

    markers.forEach(item => {
        const isVisible = (filterValue === 'all' || item.type === filterValue) &&
                          (item.title.includes(searchText) || item.description.includes(searchText));

        if (isVisible) {
            item.marker.addTo(map);
        } else {
            map.removeLayer(item.marker);
        }
    });

    showSearchResults(searchText);
}

function showSearchResults(searchText) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    if (searchText.trim() === '') {
        resultsContainer.style.display = 'none';
        return;
    }

    const filteredMarkers = markers.filter(item => 
        item.title.includes(searchText) || item.description.includes(searchText)
    );

    if (filteredMarkers.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    const ul = document.createElement('ul');

    filteredMarkers.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.title}: ${item.description}`;
        li.addEventListener('click', () => {
            map.setView(item.marker.getLatLng(), 12);
            item.marker.openPopup();
            resultsContainer.style.display = 'none';
        });
        ul.appendChild(li);
    });

    resultsContainer.appendChild(ul);
    resultsContainer.style.display = 'block';
}

function updateKSTTime() {
    const now = new Date();
    const kstOffset = 9 * 60;
    const utcMinutes = now.getUTCMinutes();
    const utcHours = now.getUTCHours();

    const kstHours = (utcHours + 9) % 24;
    const kstMinutes = utcMinutes;
    const kstSeconds = now.getUTCSeconds();

    const hours = String(kstHours).padStart(2, '0');
    const minutes = String(kstMinutes).padStart(2, '0');
    const seconds = String(kstSeconds).padStart(2, '0');

    const timeString = `${hours}:${minutes}:${seconds}`;
    document.getElementById('kst-time').textContent = timeString;
}

window.addEventListener('load', () => {
    updateKSTTime();
    setInterval(updateKSTTime, 1000);
    loadRealTimeData();
});

async function loadRealTimeData() {
    try {
        // 데이터 요청
        const response = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2020-01-01&endtime=2024-12-31&minlatitude=33.0&maxlatitude=43.0&minlongitude=124.0&maxlongitude=132.0');
        const data = await response.json();

        const earthquakes = data.features.filter(point => {
            const [lon, lat] = point.geometry.coordinates;
            const place = point.properties.place || '';
            return lat >= 33.0 && lat <= 43.0 && lon >= 124.0 && lon <= 132.0 && !place.includes('Japan');
        });

        const markerPromises = earthquakes.map(point => {
            const [lon, lat] = point.geometry.coordinates;
            const marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'marker-icon-blue' }) })
                .bindPopup(`<h3>지진 발생</h3><p>발생일: ${new Date(point.properties.time).toLocaleString()}<br>위치: ${point.properties.place}</p>`)
                .addTo(map);

            markers.push({
                marker: marker,
                type: 'disaster',
                title: '지진',
                description: `발생일: ${new Date(point.properties.time).toLocaleString()}, 위치: ${point.properties.place}`
            });

            markerCounts.disaster++;
        });

        await Promise.all(markerPromises);
        updateLegend();

    } catch (error) {
        console.error('지진 데이터 가져오기 오류:', error);
    }
}
