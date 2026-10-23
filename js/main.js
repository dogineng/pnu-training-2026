/**
 * 2026 부산대학교 직무연수 포털 - 메인 인터랙션 스크립트 (main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 상태 관리 객체
  const state = {
    allCourses: [],
    filteredCourses: [],
    categories: [],
    filters: {
      search: '',
      category: 'all',
      target: 'all',
      type: 'all',
      method: 'all',
      sort: 'code',
      view: 'grid'
    }
  };

  // DOM 엘리먼트 캐싱
  const elements = {
    coursesGrid: document.getElementById('coursesGrid'),
    coursesTableWrap: document.getElementById('coursesTableWrap'),
    coursesTableBody: document.getElementById('coursesTableBody'),
    emptyState: document.getElementById('emptyState'),
    resultCount: document.getElementById('resultCount'),
    categoryChipsWrap: document.getElementById('categoryChipsWrap'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    filterTarget: document.getElementById('filterTarget'),
    filterType: document.getElementById('filterType'),
    filterMethod: document.getElementById('filterMethod'),
    filterSort: document.getElementById('filterSort'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),
    gridViewBtn: document.getElementById('gridViewBtn'),
    tableViewBtn: document.getElementById('tableViewBtn'),
    // 통계 카운터
    statTotal: document.getElementById('statTotal'),
    statEssential: document.getElementById('statEssential'),
    statOnline: document.getElementById('statOnline'),
    statOffline: document.getElementById('statOffline'),
    lastSyncTime: document.getElementById('lastSyncTime')
  };

  /**
   * 초기화 함수
   */
  async function init() {
    renderSkeletons(6);
    setupEventListeners();

    try {
      const data = await fetchCourses();
      state.allCourses = data;
      state.filteredCourses = [...data];

      updateStats(data);
      buildCategoryChips(data);
      applyFilters();

      // 동기화 시간 업데이트
      const now = new Date();
      if (elements.lastSyncTime) {
        elements.lastSyncTime.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 기준 실시간 연동`;
      }
    } catch (error) {
      showErrorState(error.message);
    }
  }

  /**
   * 로딩 스켈레톤 렌더링
   */
  function renderSkeletons(count = 6) {
    if (!elements.coursesGrid) return;
    elements.coursesGrid.innerHTML = Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-shimmer skeleton-line" style="width: 35%;"></div>
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-line" style="width: 90%;"></div>
        <div class="skeleton-shimmer skeleton-line" style="width: 70%;"></div>
        <div class="skeleton-shimmer skeleton-line" style="height: 48px; margin-top: 18px; border-radius: 8px;"></div>
      </div>
    `).join('');
  }

  /**
   * 통계 카드 수치 업데이트
   */
  function updateStats(courses) {
    const total = courses.length;
    const essential = courses.filter(c => c.type.includes('필수')).length;
    const online = courses.filter(c => c.method === '온라인').length;
    const offlineOrMixed = courses.filter(c => c.method === '집합' || c.method === '혼합').length;

    animateCounter(elements.statTotal, total);
    animateCounter(elements.statEssential, essential);
    animateCounter(elements.statOnline, online);
    animateCounter(elements.statOffline, offlineOrMixed);
  }

  function animateCounter(el, targetVal) {
    if (!el) return;
    el.textContent = `${targetVal}개`;
  }

  /**
   * 분야별 칩 버튼 동적 생성
   */
  function buildCategoryChips(courses) {
    if (!elements.categoryChipsWrap) return;

    // 카테고리 추출 및 코스 개수 계산
    const catMap = new Map();
    courses.forEach(c => {
      const cat = c.category || '기타';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    state.categories = Array.from(catMap.entries());

    let chipsHtml = `
      <button type="button" class="chip-btn active" data-category="all">
        전체 <span class="chip-count">${courses.length}</span>
      </button>
    `;

    state.categories.forEach(([cat, count]) => {
      chipsHtml += `
        <button type="button" class="chip-btn" data-category="${escapeHtml(cat)}">
          ${escapeHtml(cat)} <span class="chip-count">${count}</span>
        </button>
      `;
    });

    elements.categoryChipsWrap.innerHTML = chipsHtml;

    // 칩 클릭 이벤트 위임
    elements.categoryChipsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-btn');
      if (!btn) return;

      elements.categoryChipsWrap.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.filters.category = btn.getAttribute('data-category');
      applyFilters();
    });
  }

  /**
   * 다중 필터 & 검색 적용
   */
  function applyFilters() {
    let result = [...state.allCourses];
    const { search, category, target, type, method, sort } = state.filters;

    // 1. 검색어 필터 (과정명, 코드, 소개, 부서, 주요내용)
    if (search.trim() !== '') {
      const query = search.trim().toLowerCase();
      result = result.filter(c => {
        return (
          c.title.toLowerCase().includes(query) ||
          c.code.toLowerCase().includes(query) ||
          c.summary.toLowerCase().includes(query) ||
          c.department.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query)
        );
      });
    }

    // 2. 분야 필터
    if (category !== 'all') {
      result = result.filter(c => c.category === category);
    }

    // 3. 대상 필터
    if (target !== 'all') {
      result = result.filter(c => c.target.includes(target));
    }

    // 4. 이수구분 필터
    if (type !== 'all') {
      result = result.filter(c => c.type.includes(type));
    }

    // 5. 교육방식 필터
    if (method !== 'all') {
      result = result.filter(c => c.method === method);
    }

    // 6. 정렬
    if (sort === 'hours') {
      result.sort((a, b) => parseInt(b.hours, 10) - parseInt(a.hours, 10));
    } else if (sort === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    } else {
      // 기본 과정코드순
      result.sort((a, b) => a.code.localeCompare(b.code));
    }

    state.filteredCourses = result;
    renderCourseList();
  }

  /**
   * 코스 목록 렌더링 (카드 그리드 또는 테이블 뷰)
   */
  function renderCourseList() {
    const list = state.filteredCourses;
    if (elements.resultCount) {
      elements.resultCount.innerHTML = `검색 결과 총 <strong>${list.length}</strong>개의 과정이 있습니다.`;
    }

    if (list.length === 0) {
      elements.coursesGrid.style.display = 'none';
      elements.coursesTableWrap.style.display = 'none';
      elements.emptyState.classList.add('active');
      return;
    }

    elements.emptyState.classList.remove('active');

    if (state.filters.view === 'grid') {
      elements.coursesGrid.style.display = 'grid';
      elements.coursesTableWrap.style.display = 'none';
      renderCards(list);
    } else {
      elements.coursesGrid.style.display = 'none';
      elements.coursesTableWrap.style.display = 'block';
      renderTable(list);
    }
  }

  /**
   * 카드 그리드 렌더링
   */
  function renderCards(courses) {
    elements.coursesGrid.innerHTML = courses.map(course => {
      const typeBadgeClass = getTypeBadgeClass(course.type);
      const methodBadgeClass = getMethodBadgeClass(course.method);
      const methodIcon = getMethodIcon(course.method);

      return `
        <article class="course-card">
          <div>
            <div class="card-top">
              <div class="badges-left">
                <span class="badge ${typeBadgeClass}">${escapeHtml(course.type)}</span>
                <span class="badge badge-method ${methodBadgeClass}">${methodIcon} ${escapeHtml(course.method)}</span>
              </div>
              <span class="category-tag">${escapeHtml(course.category)}</span>
            </div>

            <div class="card-body">
              <div class="course-code">${escapeHtml(course.code)}</div>
              <h3 class="course-title">
                <a href="detail.html?code=${encodeURIComponent(course.code)}" title="${escapeHtml(course.title)}">
                  ${escapeHtml(course.title)}
                </a>
              </h3>
              <p class="course-summary">${escapeHtml(course.summary || course.description)}</p>
            </div>

            <div class="card-meta-list">
              <div class="meta-item">
                <span class="meta-icon">⏱️</span>
                <span>시간: <strong>${escapeHtml(course.hours)}</strong></span>
              </div>
              <div class="meta-item">
                <span class="meta-icon">👥</span>
                <span>대상: <strong>${escapeHtml(course.target)}</strong></span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-icon">📅</span>
                <span>기간: <strong>${escapeHtml(course.period)}</strong></span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <span class="department-name">${escapeHtml(course.department)}</span>
            <a href="detail.html?code=${encodeURIComponent(course.code)}" class="detail-btn">
              상세보기 & 신청 →
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * 테이블 뷰 렌더링
   */
  function renderTable(courses) {
    elements.coursesTableBody.innerHTML = courses.map(course => {
      const typeBadgeClass = getTypeBadgeClass(course.type);
      const methodBadgeClass = getMethodBadgeClass(course.method);
      const methodIcon = getMethodIcon(course.method);

      return `
        <tr>
          <td><code style="font-weight:700; color:var(--pnu-blue-600);">${escapeHtml(course.code)}</code></td>
          <td><span class="badge ${typeBadgeClass}">${escapeHtml(course.type)}</span></td>
          <td><strong><a href="detail.html?code=${encodeURIComponent(course.code)}">${escapeHtml(course.title)}</a></strong></td>
          <td>${escapeHtml(course.category)}</td>
          <td><span class="badge badge-method ${methodBadgeClass}">${methodIcon} ${escapeHtml(course.method)}</span></td>
          <td>${escapeHtml(course.target)}</td>
          <td>${escapeHtml(course.hours)}</td>
          <td>${escapeHtml(course.period)}</td>
          <td>${escapeHtml(course.department)}</td>
          <td>
            <a href="detail.html?code=${encodeURIComponent(course.code)}" class="detail-btn" style="padding:4px 8px; font-size:0.75rem;">
              상세
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    // 실시간 검색 디바운스
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length > 0) {
        elements.searchClearBtn.classList.add('active');
      } else {
        elements.searchClearBtn.classList.remove('active');
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = val;
        applyFilters();
      }, 200);
    });

    // 검색어 지우기
    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.searchClearBtn.classList.remove('active');
      state.filters.search = '';
      applyFilters();
      elements.searchInput.focus();
    });

    // 세부 셀렉터 변경
    elements.filterTarget.addEventListener('change', (e) => {
      state.filters.target = e.target.value;
      applyFilters();
    });

    elements.filterType.addEventListener('change', (e) => {
      state.filters.type = e.target.value;
      applyFilters();
    });

    elements.filterMethod.addEventListener('change', (e) => {
      state.filters.method = e.target.value;
      applyFilters();
    });

    elements.filterSort.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      applyFilters();
    });

    // 필터 초기화
    const resetAll = () => {
      elements.searchInput.value = '';
      elements.searchClearBtn.classList.remove('active');
      elements.filterTarget.value = 'all';
      elements.filterType.value = 'all';
      elements.filterMethod.value = 'all';
      elements.filterSort.value = 'code';

      state.filters = {
        search: '',
        category: 'all',
        target: 'all',
        type: 'all',
        method: 'all',
        sort: 'code',
        view: state.filters.view
      };

      if (elements.categoryChipsWrap) {
        elements.categoryChipsWrap.querySelectorAll('.chip-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-category') === 'all');
        });
      }

      applyFilters();
    };

    elements.resetFiltersBtn.addEventListener('click', resetAll);
    elements.emptyResetBtn.addEventListener('click', resetAll);

    // 뷰 전환 토글 (카드 그리드 <-> 테이블)
    elements.gridViewBtn.addEventListener('click', () => {
      state.filters.view = 'grid';
      elements.gridViewBtn.classList.add('active');
      elements.tableViewBtn.classList.remove('active');
      renderCourseList();
    });

    elements.tableViewBtn.addEventListener('click', () => {
      state.filters.view = 'table';
      elements.tableViewBtn.classList.add('active');
      elements.gridViewBtn.classList.remove('active');
      renderCourseList();
    });
  }

  /**
   * 에러 발생 시 안내 표시
   */
  function showErrorState(msg) {
    if (!elements.coursesGrid) return;
    elements.coursesGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 12px; text-align: center; color: #991b1b;">
        <h3 style="margin-bottom: 8px;">구글 시트 연동 중 오류가 발생했습니다</h3>
        <p style="font-size: 0.9rem; margin-bottom: 16px;">${escapeHtml(msg)}</p>
        <button onclick="location.reload()" style="background: #b91c1c; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">새로고침 다시 시도</button>
      </div>
    `;
  }

  // 유틸리티 함수
  function getTypeBadgeClass(type) {
    if (type.includes('필수')) return 'badge-essential';
    if (type.includes('권장')) return 'badge-recommended';
    return 'badge-optional';
  }

  function getMethodBadgeClass(method) {
    if (method === '온라인') return 'method-online';
    if (method === '집합') return 'method-offline';
    return 'method-mixed';
  }

  function getMethodIcon(method) {
    if (method === '온라인') return '💻';
    if (method === '집합') return '🏫';
    return '🔄';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 초기화 실행
  init();
});
