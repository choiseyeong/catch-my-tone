// ─── Stage definitions ───────────────────────────────────────────────────────
// Stage 1: 베이스 파운데이션 선택 (좌·우 호수 swatch)
// Stage 2~5: 비교 천 3쌍 (옵션 1 / 옵션 2 토글 → good 으로 선택 → ok 로 다음 단계)

const STAGE_TITLES = {
  1: { title: '베이스 파운데이션 선택', sub: '손 인식 모델 워밍업',
       desc: '웜/쿨 베이스 파운데이션 호수(13~25호) 중 피부에 맞는 것을 검지로 선택하세요. 이 선택은 최종 계절 판정에 반영되지 않으며, 손 인식 모델 테스트 및 워밍업용입니다.' },
  2: { title: '웜톤 vs 쿨톤', sub: '베이스 톤 비교',
       desc: '얼굴 옆에 천을 대고 피부가 더 환해 보이는 쪽을 골라요. 1번(웜) / 2번(쿨) 손모양으로 천을 바꾸고, good 손모양으로 선택, OK 사인으로 다음 단계.' },
  3: { title: '저명도 vs 고명도', sub: '명도 비교',
       desc: '어두운 천과 밝은 천 중 얼굴이 더 살아 보이는 쪽을 골라요. 1번(저명도) / 2번(고명도) 손모양으로 천을 바꿔보세요.' },
  4: { title: '저채도 vs 고채도', sub: '채도 비교',
       desc: '선명한 색과 부드러운 색 중 더 잘 어울리는 쪽을 골라요. 1번(저채도) / 2번(고채도) 손모양으로 천을 바꿔보세요.' },
  5: { title: '청색 vs 탁색', sub: '청·탁 비교',
       desc: '맑은 색감과 차분한 색감 중 어떤 쪽이 더 어울리는지 비교해요. 1번(청색) / 2번(탁색) 손모양으로 천을 바꿔보세요.' },
  6: { title: '베스트 vs 워스트 체험', sub: '나만의 색상 차이 느끼기',
       desc: '☝️로 내 베스트 컬러, ✌️로 내 워스트 컬러를 얼굴에 드레이핑해 차이를 직접 느껴보세요. 👌 OK 사인이나 아래 버튼으로 결과를 확인하세요.' },
};

// Stage metadata (axis, option keys). Pairs are selected dynamically from
// COMPARE_POOLS depending on the previous stages' results.
const COMPARE_STAGES = {
  2: { axis: 'tone',    opt1: { key: 'warm',   label: '웜' },      opt2: { key: 'cool',    label: '쿨' } },
  3: { axis: 'value',   opt1: { key: 'dark',   label: '저명도' },   opt2: { key: 'light',   label: '고명도' } },
  4: { axis: 'chroma',  opt1: { key: 'muted',  label: '저채도' },   opt2: { key: 'bright',  label: '고채도' } },
  5: { axis: 'clarity', opt1: { key: 'clear',  label: '청색' },     opt2: { key: 'grayish', label: '탁색' } },
};

// Pools of comparison pairs per stage × context.
// Stage 2 only has 'default' (decision begins here).
// Stage 3 branches on tone, stage 4 on tone+value, stage 5 on tentative season.
const COMPARE_POOLS = {
  2: {
    default: [
      { title: '핑크 비교',   opt1: { hex: '#F4A698', name: '웜핑크' },   opt2: { hex: '#F4A6C6', name: '쿨핑크' } },
      { title: '블루 비교',   opt1: { hex: '#88BBDD', name: '웜블루' },   opt2: { hex: '#7AA8E5', name: '쿨블루' } },
      { title: '베이직 비교', opt1: { hex: '#F5ECD7', name: '아이보리' }, opt2: { hex: '#FAFAFA', name: '화이트' } },
    ],
  },
  3: {
    warm: [
      { title: '옐로우 명도', opt1: { hex: '#C99A2A', name: '머스터드' },  opt2: { hex: '#FFF4B0', name: '크림옐로우' } },
      { title: '오렌지 명도', opt1: { hex: '#8B4513', name: '딥브라운' },  opt2: { hex: '#FFC9A8', name: '피치' } },
      { title: '레드 명도',   opt1: { hex: '#8B2030', name: '다크와인' },  opt2: { hex: '#FF8C7A', name: '코랄' } },
    ],
    cool: [
      { title: '블루 명도',   opt1: { hex: '#1F2D5C', name: '네이비' },    opt2: { hex: '#B6D4E8', name: '라이트블루' } },
      { title: '퍼플 명도',   opt1: { hex: '#3A2D5A', name: '딥플럼' },    opt2: { hex: '#D8C8E8', name: '라일락' } },
      { title: '명도 대비',   opt1: { hex: '#0F0F12', name: '블랙' },      opt2: { hex: '#FFFFFF', name: '화이트' } },
    ],
    neutral: [
      { title: '명도 대비',   opt1: { hex: '#0F0F12', name: '블랙' },         opt2: { hex: '#FFFFFF', name: '화이트' } },
      { title: '그레이 명도', opt1: { hex: '#3D3D3D', name: '차콜' },         opt2: { hex: '#D0D0D0', name: '라이트그레이' } },
      { title: '브라운 명도', opt1: { hex: '#3E2A1B', name: '다크브라운' },   opt2: { hex: '#D8B894', name: '라이트브라운' } },
    ],
  },
  4: {
    'warm-light': [
      { title: '코랄 채도',   opt1: { hex: '#C28A91', name: '더스티코랄' }, opt2: { hex: '#FF7F50', name: '비비드코랄' } },
      { title: '옐로우 채도', opt1: { hex: '#D4C58E', name: '스트로우' },   opt2: { hex: '#FFD700', name: '골드' } },
      { title: '그린 채도',   opt1: { hex: '#A6B89A', name: '세이지' },     opt2: { hex: '#5DD09B', name: '스프링그린' } },
    ],
    'warm-dark': [
      { title: '브릭 채도',   opt1: { hex: '#A5736F', name: '더스티벽돌' }, opt2: { hex: '#B5651D', name: '캐러멜' } },
      { title: '올리브 채도', opt1: { hex: '#7A7A5B', name: '머디올리브' }, opt2: { hex: '#808000', name: '올리브' } },
      { title: '브라운 채도', opt1: { hex: '#8B7B6F', name: '더스티브라운' },opt2: { hex: '#A0522D', name: '시에나' } },
    ],
    'cool-light': [
      { title: '핑크 채도',   opt1: { hex: '#C8A2B3', name: '더스티핑크' },   opt2: { hex: '#FFB6C1', name: '라이트핑크' } },
      { title: '블루 채도',   opt1: { hex: '#7A8FA8', name: '더스티블루' },   opt2: { hex: '#88B0E8', name: '스카이블루' } },
      { title: '라일락 채도', opt1: { hex: '#A89BB1', name: '그레이라벤더' }, opt2: { hex: '#C8A8E0', name: '라일락' } },
    ],
    'cool-dark': [
      { title: '레드 채도',   opt1: { hex: '#7A4040', name: '다크와인' },    opt2: { hex: '#DC143C', name: '크림슨' } },
      { title: '블루 채도',   opt1: { hex: '#2C3E5C', name: '슬레이트' },    opt2: { hex: '#0F4C81', name: '클래식블루' } },
      { title: '퍼플 채도',   opt1: { hex: '#4A3A5C', name: '머디퍼플' },    opt2: { hex: '#7F00FF', name: '바이올렛' } },
    ],
  },
  5: {
    spring: [
      { title: '코랄 청탁',   opt1: { hex: '#FF8868', name: '클리어코랄' },   opt2: { hex: '#D8A795', name: '살몬베이지' } },
      { title: '옐로우 청탁', opt1: { hex: '#FFE066', name: '클리어옐로우' }, opt2: { hex: '#D4C58E', name: '스트로우' } },
      { title: '그린 청탁',   opt1: { hex: '#5DD09B', name: '클리어그린' },   opt2: { hex: '#A6B89A', name: '세이지' } },
    ],
    summer: [
      { title: '라벤더 청탁', opt1: { hex: '#C6A6F0', name: '클리어라벤더' }, opt2: { hex: '#A89BB1', name: '그레이라벤더' } },
      { title: '핑크 청탁',   opt1: { hex: '#FF99CC', name: '클리어핑크' },   opt2: { hex: '#C8A2B3', name: '더스티핑크' } },
      { title: '블루 청탁',   opt1: { hex: '#7AA8E5', name: '클리어블루' },   opt2: { hex: '#7A8FA8', name: '더스티블루' } },
    ],
    autumn: [
      { title: '브릭 청탁',     opt1: { hex: '#B5651D', name: '클리어캐러멜' }, opt2: { hex: '#8B7B6F', name: '더스티브라운' } },
      { title: '올리브 청탁',   opt1: { hex: '#808000', name: '클리어올리브' }, opt2: { hex: '#7A7A5B', name: '머디올리브' } },
      { title: '머스터드 청탁', opt1: { hex: '#DAA520', name: '골든머스터드' }, opt2: { hex: '#A89270', name: '더스티베이지' } },
    ],
    winter: [
      { title: '코발트 청탁', opt1: { hex: '#0F4C81', name: '클리어코발트' }, opt2: { hex: '#3D5A7A', name: '그레이블루' } },
      { title: '마젠타 청탁', opt1: { hex: '#C71585', name: '클리어마젠타' }, opt2: { hex: '#7A4A60', name: '머디마젠타' } },
      { title: '레드 청탁',   opt1: { hex: '#DC143C', name: '클리어크림슨' }, opt2: { hex: '#7A4040', name: '머디와인' } },
    ],
  },
};

// Human-readable context label for the side panel.
const CONTEXT_LABELS = {
  3: { warm: '웜 계열 명도 비교', cool: '쿨 계열 명도 비교', neutral: '뉴트럴 명도 비교' },
  4: {
    'warm-light': '봄웜 후보 채도 비교', 'warm-dark': '가을웜 후보 채도 비교',
    'cool-light': '여름쿨 후보 채도 비교', 'cool-dark': '겨울쿨 후보 채도 비교',
  },
  5: { spring: '봄웜 청·탁 비교', summer: '여름쿨 청·탁 비교', autumn: '가을웜 청·탁 비교', winter: '겨울쿨 청·탁 비교' },
};
