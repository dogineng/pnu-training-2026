/**
 * 2026 부산대학교 직무연수 포털 - 상세 페이지 스크립트 (detail.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseCode = urlParams.get('code');

  // DOM 캐싱
  const dom = {
    breadcrumbCategory: document.getElementById('breadcrumbCategory'),
    breadcrumbTitle: document.getElementById('breadcrumbTitle'),
    detailTypeBadge: document.getElementById('detailTypeBadge'),
    detailMethodBadge: document.getElementById('detailMethodBadge'),
    detailCodeBadge: document.getElementById('detailCodeBadge'),
    detailTitle: document.getElementById('detailTitle'),
    detailSummary: document.getElementById('detailSummary'),
    detailPeriod: document.getElementById('detailPeriod'),
    detailApplyPeriod: document.getElementById('detailApplyPeriod'),
    detailHours: document.getElementById('detailHours'),
    detailTarget: document.getElementById('detailTarget'),
    detailMethodCapacity: document.getElementById('detailMethodCapacity'),
    detailDepartment: document.getElementById('detailDepartment'),
    detailDescription: document.getElementById('detailDescription'),
    detailObjectivesList: document.getElementById('detailObjectivesList'),
    detailCurriculumList: document.getElementById('detailCurriculumList'),
    relatedCoursesGrid: document.getElementById('relatedCoursesGrid'),
    relatedSection: document.getElementById('relatedSection'),
    applyLinkBtn: document.getElementById('applyLinkBtn'),
    shareBtn: document.getElementById('shareBtn'),
    detailContactText: document.getElementById('detailContactText'),
    callContactBtn: document.getElementById('callContactBtn')
  };

  if (!courseCode) {
    showError("과정 코드가 지정되지 않았습니다. 메인 목록으로 이동합니다.", true);
    return;
  }

  try {
    const allCourses = await fetchCourses();
    const course = allCourses.find(c => c.code.toLowerCase() === courseCode.trim().toLowerCase());

    if (!course) {
      showError(`과정 코드 [${escapeHtml(courseCode)}]에 해당하는 연수 과정을 찾을 수 없습니다.`, false);
      return;
    }

    // 1. 브라우저 탭 타이틀
    document.title = `${course.title} - 2026 부산대학교 직무연수`;

    // 2. 브레드크럼
    dom.breadcrumbCategory.textContent = course.category;
    dom.breadcrumbTitle.textContent = course.title;

    // 3. 뱃지
    dom.detailTypeBadge.className = `badge ${getTypeBadgeClass(course.type)}`;
    dom.detailTypeBadge.textContent = course.type;

    dom.detailMethodBadge.className = `badge badge-method ${getMethodBadgeClass(course.method)}`;
    dom.detailMethodBadge.textContent = `${getMethodIcon(course.method)} ${course.method}`;

    dom.detailCodeBadge.textContent = course.code;

    // 4. 타이틀 및 서머리
    dom.detailTitle.textContent = course.title;
    dom.detailSummary.textContent = course.summary || course.description;

    // 5. 핵심 스펙 그리드
    dom.detailPeriod.textContent = course.period || '상시';
    dom.detailApplyPeriod.textContent = course.applyPeriod || '상시';
    dom.detailHours.textContent = course.hours || '-';
    dom.detailTarget.textContent = course.target || '전 직원';
    dom.detailMethodCapacity.textContent = `${course.method} (정원: ${course.capacity})`;
    dom.detailDepartment.textContent = course.department || '-';

    // 6. 상세 소개 본문
    dom.detailDescription.textContent = course.description || course.summary || '상세 소개 내용이 등록되어 있지 않습니다.';

    // 7. 학습 목표 (배열)
    if (course.objectives && course.objectives.length > 0) {
      dom.detailObjectivesList.innerHTML = course.objectives.map(item => `
        <li class="bullet-item">${escapeHtml(item)}</li>
      `).join('');
    } else {
      dom.detailObjectivesList.innerHTML = `<li class="bullet-item">실무 역량 강화 및 전문 지식 습득</li>`;
    }

    // 8. 주요 교육 내용 (배열)
    if (course.curriculum && course.curriculum.length > 0) {
      dom.detailCurriculumList.innerHTML = course.curriculum.map(item => `
        <div class="curriculum-chip">
          <span>📌</span>
          <span>${escapeHtml(item)}</span>
        </div>
      `).join('');
    } else {
      dom.detailCurriculumList.innerHTML = `<div class="curriculum-chip">세부 커리큘럼은 수강 신청 페이지를 참조하세요.</div>`;
    }

    // 9. 사이드바 신청 및 문의
    if (course.applyUrl && course.applyUrl !== '#') {
      dom.applyLinkBtn.href = course.applyUrl;
    } else {
      dom.applyLinkBtn.href = 'https://hrd.pusan.ac.kr';
    }

    dom.detailContactText.textContent = course.contact || `${course.department} 담당자 문의`;

    // 전화번호 파싱
    const phoneMatch = (course.contact || '').match(/[\d-]{9,14}/);
    if (phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/-/g, '');
      dom.callContactBtn.href = `tel:${cleanPhone}`;
      dom.callContactBtn.style.display = 'inline-flex';
    } else {
      dom.callContactBtn.style.display = 'none';
    }

    // 10. 공유하기 버튼 이벤트
    dom.shareBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(window.location.href);
          alert('연수 과정 링크가 클립보드에 복사되었습니다.');
        } else {
          // Fallback
          const tempInput = document.createElement('input');
          tempInput.value = window.location.href;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          alert('연수 과정 링크가 클립보드에 복사되었습니다.');
        }
      } catch (e) {
        prompt('아래 주소를 복사하세요:', window.location.href);
      }
    });

    // 11. 동일 분야 추천 과정 렌더링
    renderRelatedCourses(allCourses, course);

  } catch (err) {
    showError(err.message, false);
  }

  /**
   * 동일 분야 연수 과정 추천
   */
  function renderRelatedCourses(allCourses, currentCourse) {
    const related = allCourses
      .filter(c => c.category === currentCourse.category && c.code !== currentCourse.code)
      .slice(0, 3);

    if (related.length === 0) {
      dom.relatedSection.style.display = 'none';
      return;
    }

    dom.relatedCoursesGrid.innerHTML = related.map(rc => `
      <div style="background: #f8fafc; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span class="badge ${getTypeBadgeClass(rc.type)}" style="font-size:0.7rem;">${escapeHtml(rc.type)}</span>
            <span style="font-size:0.75rem; color:var(--text-tertiary);">${escapeHtml(rc.hours)}</span>
          </div>
          <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px; color:var(--text-primary); line-height:1.4;">
            <a href="detail.html?code=${encodeURIComponent(rc.code)}" style="color:var(--text-primary);">
              ${escapeHtml(rc.title)}
            </a>
          </h4>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${escapeHtml(rc.summary || rc.description)}
          </p>
        </div>
        <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-tertiary);">${escapeHtml(rc.method)}</span>
          <a href="detail.html?code=${encodeURIComponent(rc.code)}" style="font-size:0.78rem; font-weight:700; color:var(--pnu-blue-600);">
            보기 →
          </a>
        </div>
      </div>
    `).join('');
  }

  function showError(msg, redirect) {
    dom.detailTitle.textContent = '과정을 불러올 수 없습니다';
    dom.detailDescription.innerHTML = `
      <div style="padding: 24px; background: #fee2e2; border-radius: 8px; color: #991b1b;">
        <p style="font-weight: bold; margin-bottom: 8px;">${escapeHtml(msg)}</p>
        <p><a href="index.html" style="text-decoration: underline; font-weight: bold;">← 전체 과정 목록으로 돌아가기</a></p>
      </div>
    `;
    if (redirect) {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2500);
    }
  }

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
});
