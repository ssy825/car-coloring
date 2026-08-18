// 13종 자동차 도안 메타데이터
export const CARS_DATA = [
  {
    id: 'lamborghini',
    name: '람보르기니 SVJ',
    nameEn: 'Lamborghini Aventador SVJ',
    category: 'supercar',
    categoryName: '슈퍼카',
    difficulty: '어려움 (정밀)',
    description: '공기역학적 에어로 다이내믹 바디와 거대한 리어 윙을 갖춘 V12 플래그십 슈퍼카',
    image: 'images/lamborghini.jpg',
    defaultColor: '#ff2d55',
    accentColor: '#ffe600'
  },
  {
    id: 'porsche',
    name: '포르쉐 911 GT3',
    nameEn: 'Porsche 911 GT3 RS',
    category: 'supercar',
    categoryName: '슈퍼카',
    difficulty: '보통',
    description: '레이스 트랙을 위해 태어난 전설적인 리어 엔진 스포츠카',
    image: 'images/porsche.jpg',
    defaultColor: '#30d158',
    accentColor: '#0a84ff'
  },
  {
    id: 'mustang',
    name: '포드 머스탱 GT',
    nameEn: 'Ford Mustang GT',
    category: 'sports',
    categoryName: '스포츠카',
    difficulty: '쉬움',
    description: '강렬한 V8 엔진 배기음과 근육질 라인의 아메리칸 머슬카',
    image: 'images/mustang.jpg',
    defaultColor: '#0a84ff',
    accentColor: '#ffffff'
  },
  {
    id: 'mercedes',
    name: '메르세데스-AMG',
    nameEn: 'Mercedes-AMG GT',
    category: 'sports',
    categoryName: '스포츠카',
    difficulty: '보통',
    description: '우아한 곡선미와 폭발적인 성능을 결합한 럭셔리 그랜드 투어러',
    image: 'images/mercedes.jpg',
    defaultColor: '#silver',
    accentColor: '#5e5ce6'
  },
  {
    id: 'police',
    name: '경찰차 순찰차',
    nameEn: 'Police Patrol Cruiser',
    category: 'special',
    categoryName: '특수차량',
    difficulty: '쉬움',
    description: '도시의 평화를 지키는 경광등과 사이렌이 달린 경찰 순찰차',
    image: 'images/police.jpg',
    defaultColor: '#1c1c1e',
    accentColor: '#0a84ff'
  },
  {
    id: 'ambulance',
    name: '119 구급차',
    nameEn: 'Emergency Ambulance',
    category: 'special',
    categoryName: '특수차량',
    difficulty: '보통',
    description: '응급 환자를 신속하게 병원으로 이송하는 최신형 구급차',
    image: 'images/ambulance.jpg',
    defaultColor: '#ffffff',
    accentColor: '#ff453a'
  },
  {
    id: 'fire_truck',
    name: '소방차 레스큐',
    nameEn: 'Rescue Fire Engine',
    category: 'special',
    categoryName: '특수차량',
    difficulty: '보통',
    description: '화재 진압 장비와 고성능 방수포를 탑재한 소방차',
    image: 'images/fire_truck.jpg',
    defaultColor: '#ff3b30',
    accentColor: '#ffd60a'
  },
  {
    id: 'school_bus',
    name: '스쿨버스',
    nameEn: 'American School Bus',
    category: 'commercial',
    categoryName: '상용/대형',
    difficulty: '쉬움',
    description: '학생들을 안전하게 학교로 데려다주는 클래식 노란색 통학 버스',
    image: 'images/school_bus.jpg',
    defaultColor: '#ffcc00',
    accentColor: '#000000'
  },
  {
    id: 'monster_truck',
    name: '몬스터 트럭',
    nameEn: 'Monster Big-Foot Truck',
    category: 'offroad',
    categoryName: '오프로드',
    difficulty: '보통',
    description: '거대한 메가 타이어와 하이 리프트 서스펜션의 괴물 트럭',
    image: 'images/monster_truck.jpg',
    defaultColor: '#bf5af2',
    accentColor: '#30d158'
  },
  {
    id: 'semi_truck',
    name: '세미 대형 트럭',
    nameEn: 'Heavy Duty Semi-Truck',
    category: 'commercial',
    categoryName: '상용/대형',
    difficulty: '보통',
    description: '대륙을 횡단하며 물류를 운송하는 웅장한 크롬 그릴의 세미 트럭',
    image: 'images/semi_truck.jpg',
    defaultColor: '#0a84ff',
    accentColor: '#ff9f0a'
  },
  {
    id: 'jeep',
    name: '오프로드 지프',
    nameEn: 'Jeep Wrangler 4x4',
    category: 'offroad',
    categoryName: '오프로드',
    difficulty: '보통',
    description: '바위산과 진흙길도 거침없이 질주하는 사륜구동 어드벤처 SUV',
    image: 'images/jeep.jpg',
    defaultColor: '#32d74b',
    accentColor: '#ff9f0a'
  },
  {
    id: 'excavator',
    name: '중장비 굴착기',
    nameEn: 'Hydraulic Excavator',
    category: 'heavy',
    categoryName: '건설/중장비',
    difficulty: '어려움 (정밀)',
    description: '강력한 유압 붐대와 버킷으로 땅을 파고 건축을 돕는 파워 굴착기',
    image: 'images/excavator.jpg',
    defaultColor: '#ff9f0a',
    accentColor: '#1c1c1e'
  },
  {
    id: 'tractor',
    name: '농업용 트랙터',
    nameEn: 'Heavy Farm Tractor',
    category: 'heavy',
    categoryName: '건설/중장비',
    difficulty: '보통',
    description: '거대한 후륜 타이어로 밭을 일구는 현대적인 농업용 트랙터',
    image: 'images/tractor.jpg',
    defaultColor: '#34c759',
    accentColor: '#ffd60a'
  }
];

export const CATEGORIES = [
  { id: 'all', name: '전체 보기' },
  { id: 'supercar', name: '슈퍼카' },
  { id: 'sports', name: '스포츠카' },
  { id: 'special', name: '특수차량' },
  { id: 'offroad', name: '오프로드' },
  { id: 'commercial', name: '상용/대형' },
  { id: 'heavy', name: '건설/중장비' }
];
