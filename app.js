// app.js - 핵심 로직 (지도 초기화, 데이터 필터링, 마커 렌더링)

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------------- //
    // 1. 상태 및 DOM 요소 초기화
    // ---------------------------------------------------------------- //
    const state = {
        map: null,
        markers: [],
        overlays: [],
        allFacilities: [], // API에서 파싱된 원본 전체 데이터
        currentPosition: { lat: 37.4938, lng: 126.9189 } // 기본 위치 (서울 보라매공원 부근)
    };

    const dom = {
        filterFree: document.getElementById('filterFree'),
        filterNight: document.getElementById('filterNight'),
        filterParking: document.getElementById('filterParking'),
        typeFilters: document.querySelectorAll('.chip'),
        myLocationBtn: document.getElementById('myLocationBtn'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn')
    };

    // ---------------------------------------------------------------- //
    // 2. 카카오맵 초기화 로직
    // ---------------------------------------------------------------- //
    function initMap() {
        const mapContainer = document.getElementById('map');

        // 카카오맵 스크립트 로드 확인
        if (typeof kakao === 'undefined' || !kakao.maps) {
            console.error("카카오맵 API가 로드되지 않았습니다.");
            mapContainer.innerHTML = '<div style="padding:20px;text-align:center;">카카오맵 API 로드 실패. index.html을 확인하세요.</div>';
            return;
        }

        const mapOption = {
            center: new kakao.maps.LatLng(state.currentPosition.lat, state.currentPosition.lng),
            level: 5
        };

        state.map = new kakao.maps.Map(mapContainer, mapOption);

        // 지도 이동 및 줌 인/아웃 발생 시 필터링 수행 (최적화)
        kakao.maps.event.addListener(state.map, 'idle', () => {
            updateMarkersInBounds();
        });

        // 내 위치 찾기 시도
        tryFindMyLocation();

        // 맵 로딩 후 공공데이터 API 호출
        fetchPublicData();
    }

    // ---------------------------------------------------------------- //
    // 3. 내 위치 가져오기 (Geolocation API)
    // ---------------------------------------------------------------- //
    function tryFindMyLocation() {
        if (navigator.geolocation) {
            showLoading(true, "위치 찾는 중...");
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    state.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    if (state.map) {
                        const moveLatLon = new kakao.maps.LatLng(state.currentPosition.lat, state.currentPosition.lng);
                        state.map.setCenter(moveLatLon);
                    }
                    showLoading(false);
                },
                (error) => {
                    console.error("위치 정보를 가져올 수 없습니다:", error);
                    alert("현위치 권한을 허용해주세요. 기본 위치로 시작합니다.");
                    showLoading(false);
                }
            );
        }
    }

    // ---------------------------------------------------------------- //
    // 4. 전국 체육시설 현황 공공데이터 Fetching
    // ---------------------------------------------------------------- //
    async function fetchPublicData() {
        showLoading(true, "공공데이터 포털에서 데이터를 불러오는 중...");

        // 공공데이터포털 "전국체육시설현황" API 키
        const API_KEY = "16c8564f7f7c681a114678f1331161df073d0bc120c7cd0e3b4b62b6496479f3";
        const BASE_URL = "https://apis.data.go.kr/B551014/SRVC_API_SFMS_FACI/TODZ_API_SFMS_FACI";

        // 1000개의 데이터를 JSON 형태로 요청
        const url = `${BASE_URL}?serviceKey=${API_KEY}&pageNo=1&numOfRows=1000&resultType=json`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API 요청 실패: ${response.status}`);
            }

            // XML로 내려올 가능성이 있어 text로 먼저 파싱을 시도합니다.
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn("JSON 파싱 에러 (CORS 혹은 XML 응답). Mock 데이터로 우회합니다.", e);
                fallbackToMockData();
                return;
            }

            // 응답 스키마 분석 및 아이템 추출
            let items = [];
            if (data?.response?.body?.items?.item) {
                items = data.response.body.items.item;
            } else if (data?.items) {
                items = data.items;
            }

            if (!Array.isArray(items)) {
                items = [items];
            }

            if (items.length === 0 || !items[0]) {
                console.warn("가져올 데이터가 없거나 형식이 다릅니다. Mock 데이터로 우회합니다.");
                fallbackToMockData();
                return;
            }

            // 앱 내부 상태 스키마로 가공
            state.allFacilities = items.map((item, index) => {
                return {
                    id: item.fclty_id || item.fcltyId || `API_${index}`,
                    name: item.fclty_nm || item.fcltyNm || item.facilName || "이름 없는 시설",
                    type: parseFacilityType(item.fclty_cl_nm || item.fclty_type || item.type || ""),
                    isFree: isFacilityFree(item),
                    hasNightLight: (Math.random() > 0.5), // 예시: 데이터에 없으면 랜덤하게 데모용으로 설정
                    hasParking: (Math.random() > 0.5),    // 예시: 위와 동일
                    latitude: parseFloat(item.fclty_la || item.lat),
                    longitude: parseFloat(item.fclty_lo || item.lng),
                    description: item.rdnmadr_nm || item.addr || item.fclty_road_nm_addr || "주소 정보 없음"
                };
            }).filter(item => !isNaN(item.latitude) && !isNaN(item.longitude)); // 유효 좌표만 남기기

            console.log(`공공데이터 API 로드 완료: ${state.allFacilities.length}개 체육시설 등록됨.`);
            updateMarkersInBounds();
            showLoading(false);

        } catch (error) {
            console.error("데이터 패치 중 오류 발생:", error);
            console.warn("API 키 승인 대기 중이거나 CORS 정책 위반일 수 있습니다. (개발 환경 제약). Mock 데이터로 우회합니다.");
            fallbackToMockData();
        }
    }

    function fallbackToMockData() {
        if (typeof mockPlaygrounds !== 'undefined') {
            state.allFacilities = mockPlaygrounds;
            updateMarkersInBounds();
            console.log("Mock 데이터가 대신 화면에 그려집니다.");
        }
        showLoading(false);
    }

    // ---------------------------------------------------------------- //
    // 5. 공공데이터 변환 유틸리티
    // ---------------------------------------------------------------- //
    function parseFacilityType(rawType) {
        if (!rawType) return "기타";
        if (rawType.includes("농구")) return "농구";
        if (rawType.includes("풋살") || rawType.includes("축구")) return "풋살";
        if (rawType.includes("테니스") || rawType.includes("배드민턴")) return "테니스";
        if (rawType.includes("체육공원") || rawType.includes("체력단련")) return "철봉";
        return "기타";
    }

    function isFacilityFree(item) {
        // 대부분 공공 체육시설 중 예약이 필요없는 야외 시설은 무료
        if (item.fclty_nm && (item.fclty_nm.includes('공원') || item.fclty_nm.includes('야외'))) {
            return true;
        }
        return Math.random() > 0.3; // 데모를 위한 랜덤 유무료 처리 (원칙적으로는 요금 필드를 까봐야 함)
    }

    // ---------------------------------------------------------------- //
    // 6. 데이터 필터링 로직 (무료, 편의시설, 종목)
    // ---------------------------------------------------------------- //
    function getFilteredData(dataList) {
        const rules = {
            freeOnly: dom.filterFree.checked,
            needNightLight: dom.filterNight.checked,
            needParking: dom.filterParking.checked,
            selectedType: document.querySelector('.chip.active').dataset.type
        };

        return dataList.filter(item => {
            if (rules.freeOnly && !item.isFree) return false;
            if (rules.needNightLight && !item.hasNightLight) return false;
            if (rules.needParking && !item.hasParking) return false;

            if (rules.selectedType !== 'all') {
                if (rules.selectedType === '철봉' && item.type !== '철봉') return false;
                if (rules.selectedType === '농구' && item.type !== '농구') return false;
                if (rules.selectedType === '풋살' && item.type !== '풋살') return false;
                if (rules.selectedType === '테니스' && item.type !== '테니스') return false;
            }
            return true;
        });
    }

    // ---------------------------------------------------------------- //
    // 7. 화면 바운더리 내 마커 최적화 렌더링
    // ---------------------------------------------------------------- //
    function updateMarkersInBounds() {
        if (!state.map || !state.allFacilities || state.allFacilities.length === 0) return;

        const bounds = state.map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // 1차 필터: 지도의 사각 영역(Boundary) 내부에 존재하는 위경도 데이터만 선별
        const inBoundsData = state.allFacilities.filter(item => {
            return (item.latitude >= sw.getLat() && item.latitude <= ne.getLat()) &&
                (item.longitude >= sw.getLng() && item.longitude <= ne.getLng());
        });

        // 2차 필터: 사용자가 조작한 필터 적용
        const finalDataToRender = getFilteredData(inBoundsData);

        clearAllMarkers();

        finalDataToRender.forEach(info => {
            createMarker(info);
        });
    }

    function clearAllMarkers() {
        if (state.markers && state.markers.length > 0) {
            state.markers.forEach(marker => marker.setMap(null));
        }
        if (state.overlays && state.overlays.length > 0) {
            state.overlays.forEach(overlay => overlay.setMap(null));
        }
        state.markers = [];
        state.overlays = [];
    }

    function createMarker(info) {
        const position = new kakao.maps.LatLng(info.latitude, info.longitude);

        const imageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'%3E%3Cpath fill='%234CAF50' d='M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z'/%3E%3C/svg%3E";
        const imageSize = new kakao.maps.Size(32, 42);
        const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

        const marker = new kakao.maps.Marker({
            position: position,
            map: state.map,
            image: markerImage
        });

        const tagsHtml = `
            ${info.isFree ? '<span class="info-tag free">무료</span>' : '<span class="info-tag" style="background:#fce4ec; color:#c2185b; border-color:#f8bbd0;">유료</span>'}
            ${info.hasNightLight ? '<span class="info-tag night">야간조명</span>' : ''}
            <span class="info-tag">${info.type}</span>
        `;

        const content = document.createElement('div');
        content.className = 'info-window';
        content.innerHTML = `
            <div class="info-title">${info.name}</div>
            <div class="info-desc">${info.description}</div>
            <div class="tag-list">${tagsHtml}</div>
        `;

        const customOverlay = new kakao.maps.CustomOverlay({
            position: position,
            content: content,
            yAnchor: 1.5,
            zIndex: 3
        });

        kakao.maps.event.addListener(marker, 'click', function () {
            state.overlays.forEach(overlay => overlay.setMap(null));
            customOverlay.setMap(state.map);
        });

        kakao.maps.event.addListener(state.map, 'click', function () {
            customOverlay.setMap(null);
        });

        state.markers.push(marker);
        state.overlays.push(customOverlay);
    }

    // ---------------------------------------------------------------- //
    // 8. 이벤트 바인딩
    // ---------------------------------------------------------------- //
    function bindEvents() {
        [dom.filterFree, dom.filterNight, dom.filterParking].forEach(el => {
            el.addEventListener('change', () => {
                updateMarkersInBounds();
            });
        });

        dom.typeFilters.forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelector('.chip.active').classList.remove('active');
                e.target.classList.add('active');
                updateMarkersInBounds();
            });
        });

        dom.myLocationBtn.addEventListener('click', () => {
            tryFindMyLocation();
        });

        dom.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                alert('본격적인 공공데이터 연동 후 활성화될 검색 기능입니다.');
            }
        });
        dom.searchBtn.addEventListener('click', () => {
            alert('본격적인 공공데이터 연동 후 활성화될 검색 기능입니다.');
        });
    }

    function showLoading(show, text = "로딩중...") {
        if (show) {
            dom.loadingOverlay.querySelector('p').innerText = text;
            dom.loadingOverlay.classList.remove('hide');
        } else {
            dom.loadingOverlay.classList.add('hide');
        }
    }

    // 실행
    bindEvents();
    initMap();
});
