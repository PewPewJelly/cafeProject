/* =============================================
   바이브 펫 호텔 예약서 — 메인 자바스크립트
   Spotify Design System 적용
   ============================================= */

// ─── DOM 요소 가져오기 ───
const form = document.getElementById('reservationForm');
const ownerNameInput = document.getElementById('ownerName');
const phoneInput = document.getElementById('phone');
const petNameInput = document.getElementById('petName');
const petTypeSelect = document.getElementById('petType');
const roomGradeRadios = document.querySelectorAll('input[name="roomGrade"]');
const serviceCheckboxes = document.querySelectorAll('input[name="service"]');
const checkInInput = document.getElementById('checkIn');
const checkOutInput = document.getElementById('checkOut');
const nightsDisplay = document.getElementById('nights');
const requestTextarea = document.getElementById('request');
const estimatedPriceDiv = document.getElementById('estimatedPrice');
const priceValueSpan = document.getElementById('priceValue');
const submitBtn = document.getElementById('submitBtn');
const excelBtn = document.getElementById('excelBtn');
const resetBtn = document.getElementById('resetBtn');
const confirmMessage = document.getElementById('confirmMessage');
const reservationCountDiv = document.getElementById('reservationCount');

// ─── localStorage에서 기존 예약 목록 불러오기 ───
let reservations = JSON.parse(localStorage.getItem('petHotelReservations')) || [];

// 페이지 로드 시 저장된 예약 건수 표시
updateReservationCount();


/* =============================================
   숙박 일수 계산 함수
   - 체크인/체크아웃 날짜 차이를 일 단위로 반환
   ============================================= */
function calculateNights() {
    const checkIn = new Date(checkInInput.value);
    const checkOut = new Date(checkOutInput.value);

    // 두 날짜가 유효하고 체크아웃이 체크인보다 이후인 경우
    if (checkInInput.value && checkOutInput.value && checkOut > checkIn) {
        const diffTime = checkOut - checkIn;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        nightsDisplay.value = `${diffDays}박`;
        return diffDays;
    }

    nightsDisplay.value = '0박';
    return 0;
}


/* =============================================
   예상 금액 계산 함수
   - 공식: (기본료 + 객실 추가금 + 서비스 합계) × 숙박 일수
   - 실시간으로 화면에 반영
   ============================================= */
function calculatePrice() {
    // 1) 반려동물 종류 기본 1박 요금
    const petTypePrice = parseInt(petTypeSelect.value) || 0;

    // 2) 객실 등급 추가금
    let roomGradePrice = 0;
    roomGradeRadios.forEach(function(radio) {
        if (radio.checked) {
            roomGradePrice = parseInt(radio.value);
        }
    });

    // 3) 추가 서비스 합계
    let servicePrice = 0;
    serviceCheckboxes.forEach(function(cb) {
        if (cb.checked) {
            servicePrice += parseInt(cb.value);
        }
    });

    // 4) 숙박 일수 계산
    const nights = calculateNights();

    // 5) 총 금액 계산 (숙박 일수 0이면 1박 기준 미리보기)
    const totalPerNight = petTypePrice + roomGradePrice + servicePrice;
    const displayNights = nights > 0 ? nights : 1;
    const total = totalPerNight * displayNights;

    // 6) 화면에 천 단위 콤마로 표시
    if (nights > 0) {
        priceValueSpan.textContent = `${total.toLocaleString()}원 (${nights}박)`;
    } else {
        priceValueSpan.textContent = `${total.toLocaleString()}원`;
    }

    return total;
}


/* =============================================
   선택된 객실 등급 이름 반환
   ============================================= */
function getSelectedRoomGrade() {
    const gradeMap = {
        '0': '스탠다드',
        '15000': '디럭스',
        '30000': '스위트'
    };
    let selectedValue = '0';
    roomGradeRadios.forEach(function(radio) {
        if (radio.checked) selectedValue = radio.value;
    });
    return gradeMap[selectedValue] || '스탠다드';
}


/* =============================================
   선택된 추가 서비스 이름 배열 반환
   ============================================= */
function getSelectedServices() {
    const services = [];
    serviceCheckboxes.forEach(function(cb) {
        if (cb.checked) {
            services.push(cb.dataset.name);
        }
    });
    return services;
}


/* =============================================
   반려동물 종류 이름 반환
   - 옵션 텍스트에서 종류명만 추출
   ============================================= */
function getPetTypeName() {
    const option = petTypeSelect.options[petTypeSelect.selectedIndex];
    if (!petTypeSelect.value) return '';
    // "소형견 (10kg 미만) — 1박 30,000원" → "소형견 (10kg 미만)"
    return option.text.split('—')[0].trim();
}


/* =============================================
   유효성 검사
   - 필수 항목 누락 시 알림 후 false 반환
   ============================================= */
function validate() {
    if (!ownerNameInput.value.trim()) {
        alert('보호자 이름을 입력해주세요');
        ownerNameInput.focus();
        return false;
    }
    if (!petNameInput.value.trim()) {
        alert('반려동물 이름을 입력해주세요');
        petNameInput.focus();
        return false;
    }
    if (!petTypeSelect.value) {
        alert('반려동물 종류를 선택해주세요');
        petTypeSelect.focus();
        return false;
    }
    if (!checkInInput.value || !checkOutInput.value) {
        alert('체크인/체크아웃 날짜를 선택해주세요');
        return false;
    }
    if (new Date(checkOutInput.value) <= new Date(checkInInput.value)) {
        alert('체크아웃 날짜를 확인해주세요 (체크인 이후여야 합니다)');
        return false;
    }
    return true;
}


/* =============================================
   저장된 예약 건수 업데이트
   ============================================= */
function updateReservationCount() {
    if (reservations.length > 0) {
        reservationCountDiv.textContent =
            `📋 저장된 예약 ${reservations.length}건 — 엑셀 저장 버튼으로 다운로드`;
    } else {
        reservationCountDiv.textContent = '';
    }
}


/* =============================================
   예약하기 버튼 클릭
   - 유효성 검사 → 예약 정보 저장 → 확인 메시지 표시
   ============================================= */
submitBtn.addEventListener('click', function() {
    if (!validate()) return;

    const total = calculatePrice();
    const nights = calculateNights();
    const services = getSelectedServices();
    const serviceText = services.length > 0 ? ` (${services.join(', ')})` : '';

    // 예약 정보 객체 생성
    const reservation = {
        '보호자 이름': ownerNameInput.value.trim(),
        '연락처': phoneInput.value.trim() || '-',
        '반려동물 이름': petNameInput.value.trim(),
        '종류': getPetTypeName(),
        '등급': getSelectedRoomGrade(),
        '추가 서비스': services.join(', ') || '없음',
        '체크인': checkInInput.value,
        '체크아웃': checkOutInput.value,
        '숙박 일수': nights + '박',
        '총 금액': total.toLocaleString() + '원',
        '요청사항': requestTextarea.value.trim() || '없음'
    };

    // localStorage에 누적 저장
    reservations.push(reservation);
    localStorage.setItem('petHotelReservations', JSON.stringify(reservations));

    // 저장 건수 업데이트
    updateReservationCount();

    // 확인 메시지 생성 및 표시
    const message =
        `${reservation['보호자 이름']}님의 반려동물 '${reservation['반려동물 이름']}' ` +
        `(${reservation['종류']}), ${reservation['등급']} 객실${serviceText} ` +
        `${nights}박, 총 ${total.toLocaleString()}원 예약이 접수되었습니다! 🎉`;

    confirmMessage.textContent = message;
    confirmMessage.style.display = 'block';

    // 확인 메시지로 부드럽게 스크롤
    confirmMessage.scrollIntoView({ behavior: 'smooth' });
});


/* =============================================
   엑셀 저장 버튼 클릭
   - SheetJS(xlsx) 라이브러리로 .xlsx 파일 생성 및 다운로드
   - 열(columns): 보호자 이름, 반려동물 이름, 종류, 등급, 추가 서비스,
                   체크인, 체크아웃, 숙박 일수, 총 금액, 요청사항
   - 행(rows): 예약 정보 순서대로 누적
   ============================================= */
excelBtn.addEventListener('click', function() {
    // 저장된 예약이 없으면 알림
    if (reservations.length === 0) {
        alert('저장된 예약 정보가 없습니다.\n먼저 예약하기를 눌러 예약을 등록해주세요.');
        return;
    }

    // SheetJS로 워크시트 생성 (JSON → 시트)
    const worksheet = XLSX.utils.json_to_sheet(reservations);

    // 워크북 생성 및 시트 추가
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '예약목록');

    // 컬럼 너비 설정 (보기 좋게)
    worksheet['!cols'] = [
        { wch: 14 },  // 보호자 이름
        { wch: 16 },  // 연락처
        { wch: 14 },  // 반려동물 이름
        { wch: 20 },  // 종류
        { wch: 12 },  // 등급
        { wch: 35 },  // 추가 서비스
        { wch: 14 },  // 체크인
        { wch: 14 },  // 체크아웃
        { wch: 10 },  // 숙박 일수
        { wch: 14 },  // 총 금액
        { wch: 30 }   // 요청사항
    ];

    // 오늘 날짜를 파일명에 포함
    const today = new Date().toISOString().slice(0, 10);
    const fileName = `바이브펫호텔_예약목록_${today}.xlsx`;

    // .xlsx 파일 다운로드
    XLSX.writeFile(workbook, fileName);

    alert(
        `✅ 엑셀 파일이 다운로드되었습니다!\n` +
        `파일명: ${fileName}\n` +
        `총 ${reservations.length}건의 예약 정보가 저장되었습니다.`
    );
});


/* =============================================
   다시 작성 버튼 클릭
   - 모든 입력 필드 초기화
   - 예상 금액 초기화
   - 확인 메시지 숨기기
   ============================================= */
resetBtn.addEventListener('click', function() {
    // 폼 초기화
    form.reset();

    // 기본 선택값 복원 (스탠다드 객실)
    document.getElementById('gradeStandard').checked = true;

    // 숙박 일수 초기화
    nightsDisplay.value = '0박';

    // 예상 금액 초기화
    priceValueSpan.textContent = '0원';

    // 확인 메시지 숨기기
    confirmMessage.style.display = 'none';

    // 금액 재계산
    calculatePrice();
});


/* =============================================
   실시간 금액 계산 이벤트 리스너 등록
   - 종류, 등급, 서비스, 날짜 변경 시 자동 재계산
   ============================================= */
petTypeSelect.addEventListener('change', calculatePrice);

roomGradeRadios.forEach(function(radio) {
    radio.addEventListener('change', calculatePrice);
});

serviceCheckboxes.forEach(function(cb) {
    cb.addEventListener('change', calculatePrice);
});

checkInInput.addEventListener('change', calculatePrice);
checkOutInput.addEventListener('change', calculatePrice);


/* =============================================
   페이지 로드 시 초기 금액 계산
   ============================================= */
calculatePrice();
