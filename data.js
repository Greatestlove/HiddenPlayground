// data.js - 공공데이터 API 연동 전 UI 및 로직 테스트를 위한 더미 데이터

const mockPlaygrounds = [
    {
        id: "P001",
        name: "보라매공원 농구장",
        type: "농구",
        isFree: true,
        hasNightLight: true,
        hasParking: true,
        latitude: 37.4938,
        longitude: 126.9189, // 보라매공원 근처
        description: "야간 조명이 있는 쾌적한 야외 농구장입니다."
    },
    {
        id: "P002",
        name: "도림천 철봉 공원",
        type: "철봉",
        isFree: true,
        hasNightLight: false,
        hasParking: false,
        latitude: 37.4855,
        longitude: 126.9388, // 신대방역 근처 도림천
        description: "다양한 높이의 철봉과 평행봉이 있습니다."
    },
    {
        id: "P003",
        name: "관악구민 종합체육센터 풋살장",
        type: "풋살",
        isFree: false, // 유료
        hasNightLight: true,
        hasParking: true,
        latitude: 37.4725,
        longitude: 126.9535, // 낙성대역 근처
        description: "예약제로 운영되는 인조잔디 풋살구장입니다."
    },
    {
        id: "P004",
        name: "여의도 한강공원 농구대",
        type: "농구",
        isFree: true,
        hasNightLight: true,
        hasParking: true,
        latitude: 37.5273,
        longitude: 126.9351, // 여의도
        description: "한강 뷰를 보며 농구할 수 있는 장소. 주말에 사람이 많습니다."
    },
    {
        id: "P005",
        name: "노들섬 다목적 운동장",
        type: "테니스",
        isFree: true,
        hasNightLight: true,
        hasParking: true,
        latitude: 37.5186,
        longitude: 126.9587, // 노들섬
        description: "간단한 배드민턴 및 자유 운동이 가능한 공간입니다."
    },
    {
        id: "P006",
        name: "반포 한강공원 달빛광장 옆 농구장",
        type: "농구",
        isFree: true,
        hasNightLight: true,
        hasParking: true,
        latitude: 37.5113,
        longitude: 126.9960, // 반포 한강공원
        description: "코트 상태가 좋고 조명이 밝습니다."
    },
    {
        id: "P007",
        name: "관악산 호수공원 체력단련장",
        type: "철봉",
        isFree: true,
        hasNightLight: false,
        hasParking: true,
        latitude: 37.4583,
        longitude: 126.9482, // 관악산
        description: "산스장(산+헬스장). 각종 웨이트 기구와 튼튼한 철봉 완비."
    }
];
