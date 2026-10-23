/**
 * 2026 부산대학교 직무연수 데이터 통신 모듈 (api.js)
 * Google Sheets GViz CSV 엔드포인트에서 실시간으로 데이터를 불러와 PapaParse로 파싱합니다.
 */

const SHEET_CONFIG = {
  sheetId: '1qi0mo4hxqP0DjxVi5kiRiWTs-g9eRqoY',
  sheetName: 'data',
  get csvUrl() {
    // 캐시 방지를 위해 타임스탬프를 쿼리에 추가하여 새로고침 시 항상 최신 시트 데이터를 가져옵니다.
    return `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(this.sheetName)}&headers=1&_t=${Date.now()}`;
  }
};

/**
 * 구글 시트에서 최신 직무연수 목록을 실시간으로 가져옵니다.
 * @returns {Promise<Array<Object>>} 연수 과정 객체 배열
 */
async function fetchCourses() {
  try {
    const response = await fetch(SHEET_CONFIG.csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`구글 시트 응답 오류 (HTTP ${response.status})`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: function (results) {
          if (!results.data || results.data.length === 0) {
            resolve([]);
            return;
          }

          // 구글 시트의 17개 컬럼을 표준 객체 모델로 매핑 및 정제
          const courses = results.data
            .filter(row => row['과정코드'] && row['과정코드'].trim() !== '')
            .map((row, index) => {
              const code = (row['과정코드'] || '').trim();
              const title = (row['과정명'] || '').trim();
              const category = (row['분야'] || '기타').trim();
              const target = (row['대상'] || '전 직원').trim();
              const type = (row['이수구분'] || '선택').trim();
              const method = (row['교육방식'] || '온라인').trim();
              const hours = (row['교육시간'] || '-').trim();
              const capacity = (row['정원'] || '무제한').trim();
              const period = (row['교육기간'] || '상시').trim();
              const applyPeriod = (row['신청기간'] || '상시').trim();
              const department = (row['담당부서'] || '인재개발원').trim();
              const summary = (row['한줄소개'] || '').trim();
              const description = (row['상세소개'] || '').trim();
              const rawObjectives = (row['학습목표'] || '').trim();
              const rawCurriculum = (row['주요내용'] || '').trim();
              const applyUrl = (row['신청링크'] || '#').trim();
              const contact = (row['문의'] || '').trim();

              // 구분자(·) 분해하여 배열로 변환
              const objectives = rawObjectives
                ? rawObjectives.split(/\s*·\s*/).filter(item => item.length > 0)
                : [];
              const curriculum = rawCurriculum
                ? rawCurriculum.split(/\s*·\s*/).filter(item => item.length > 0)
                : [];

              return {
                id: index + 1,
                code,
                title,
                category,
                target,
                type,
                method,
                hours,
                capacity,
                period,
                applyPeriod,
                department,
                summary,
                description,
                objectives,
                curriculum,
                applyUrl,
                contact
              };
            });

          resolve(courses);
        },
        error: function (error) {
          reject(new Error(`CSV 파싱 실패: ${error.message}`));
        }
      });
    });
  } catch (err) {
    console.error('연수 데이터 불러오기 실패:', err);
    throw err;
  }
}

/**
 * 특정 과정코드로 단일 연수 과정을 조회합니다.
 * @param {string} courseCode 과정코드 (예: PNU-2026-001)
 * @returns {Promise<Object|null>} 해당 과정 객체
 */
async function fetchCourseByCode(courseCode) {
  const allCourses = await fetchCourses();
  const matched = allCourses.find(c => c.code.toLowerCase() === (courseCode || '').trim().toLowerCase());
  return matched || null;
}
