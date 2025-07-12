import { useState, useEffect } from \'react\';
import \'./App.css\';

function App() {
  const [cases, setCases] = useState(() => {
    const savedCases = localStorage.getItem(\'modernHouseCases\');
    return savedCases ? JSON.parse(savedCases) : [];
  });
  const [currentTab, setCurrentTab] = useState(\'addEdit\');
  const [apiStatus, setApiStatus] = useState(\'disconnected\'); // connected, disconnected, error
  const [searchTerm, setSearchTerm] = useState(\'\');
  const [editingCase, setEditingCase] = useState(null);

  useEffect(() => {
    localStorage.setItem(\'modernHouseCases\', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(\'http://localhost:5000/api/cases\' ); // 嘗試連接後端API
      if (response.ok) {
        setApiStatus(\'connected\');
      } else {
        setApiStatus(\'disconnected\');
      }
    } catch (error) {
      setApiStatus(\'disconnected\');
      console.error(\'API connection error:\', error);
    }
  };

  const saveCases = (newCases) => {
    setCases(newCases);
    localStorage.setItem(\'modernHouseCases\', JSON.stringify(newCases));
  };

  const addOrUpdateCase = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCase = {
      id: editingCase ? editingCase.id : Date.now().toString(), // 使用時間戳作為唯一ID
      case_name: formData.get(\'case_name\'),
      modern_house_youtube_link: formData.get(\'modern_house_youtube_link\'),
      searchome_link: formData.get(\'searchome_link\'),
      gorgeous_space_link: formData.get(\'gorgeous_space_link\'),
      uploaded_to_modern_house: e.target.elements.uploaded_to_modern_house.checked,
      remarks: formData.get(\'remarks\'),
    };

    if (editingCase) {
      // 更新現有案例
      const updatedCases = cases.map((c) =>
        c.id === newCase.id ? newCase : c
      );
      saveCases(updatedCases);
      setEditingCase(null);
      alert(\'案例更新成功！\');
    } else {
      // 新增案例
      const updatedCases = [...cases, newCase];
      saveCases(updatedCases);
      alert(\'案例新增成功！\');
    }
    e.target.reset();
  };

  // 刪除案例
  const deleteCase = (id) => {
    if (confirm(\'確定要刪除此案例嗎？\')) {
      const updatedCases = cases.filter(caseItem => caseItem.id !== id);
      saveCases(updatedCases);
    }
  };

  // 編輯案例
  const editCase = (caseData) => {
    setEditingCase(caseData);
    setCurrentTab(\'addEdit\'); // 切換到新增/編輯頁面
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (Array.isArray(importedData)) {
            // 簡單的合併邏輯：以importedData為主，如果ID重複則覆蓋
            const existingCaseIds = new Set(cases.map(c => c.id));
            const newCases = importedData.filter(ic => !existingCaseIds.has(ic.id));
            const updatedCases = cases.map(ec => {
              const importedVersion = importedData.find(ic => ic.id === ec.id);
              return importedVersion ? importedVersion : ec;
            });
            saveCases([...updatedCases, ...newCases]);
            alert(\'資料匯入成功！\');
          } else {
            alert(\'匯入檔案格式不正確，請確保是JSON陣列。\');
          }
        } catch (error) {
          alert(\'解析檔案失敗，請確保是有效的JSON格式。\');
          console.error(\'Import error:\', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(cases, null, 2);
    const blob = new Blob([dataStr], { type: \'application/json\' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement(\'a\');
    a.href = url;
    a.download = `摩登雅舍案例資料_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBatchCheck = async () => {
    if (apiStatus !== \'connected\') {
      alert(\'後端API未連接，無法執行批量檢查。請確保後端服務已啟動。\');
      return;
    }

    const results = [];
    for (const caseItem of cases) {
      let modernHouseYoutubeExists = false;
      let searchomeVideoExists = false;
      let gorgeousSpaceVideoExists = false;

      // 檢查摩登雅舍YouTube連結
      if (caseItem.modern_house_youtube_link) {
        try {
          const response = await fetch(\'http://localhost:5000/api/youtube/check_channel_video_existence\', {
            method: \'POST\',
            headers: { \'Content-Type\': \'application/json\' },
            body: JSON.stringify({
              video_url: caseItem.modern_house_youtube_link,
              channel_id: \'UCwTShuBukB8DsgvSSu_hpWg\', // 摩登雅舍的YouTube頻道ID
            } ),
          });
          const data = await response.json();
          modernHouseYoutubeExists = data.exists_in_channel;
        } catch (error) {
          console.error(`檢查摩登雅舍YouTube連結失敗 (${caseItem.case_name}):`, error);
        }
      }

      // 檢查設計家連結 (簡化處理，只檢查是否為有效URL)
      if (caseItem.searchome_link) {
        try {
          new URL(caseItem.searchome_link);
          searchomeVideoExists = true;
        } catch { /* 無效URL */ }
      }

      // 檢查幸福空間連結 (簡化處理，只檢查是否為有效URL)
      if (caseItem.gorgeous_space_link) {
        try {
          new URL(caseItem.gorgeous_space_link);
          gorgeousSpaceVideoExists = true;
        } catch { /* 無效URL */ }
      }

      let recommendation = \'無需特別處理\';
      let warning = \'\';

      if (modernHouseYoutubeExists) {
        if (searchomeVideoExists || gorgeousSpaceVideoExists) {
          warning = \'警告：影片已在摩登雅舍頻道，但設計家或幸福空間仍有連結，請確認是否為重複內容。\';
        }
      } else {
        if (searchomeVideoExists || gorgeousSpaceVideoExists) {
          recommendation = \'建議搬移：設計家或幸福空間有影片，但摩登雅舍頻道沒有，建議搬移。\';
        }
      }

      results.push({
        case_name: caseItem.case_name,
        modern_house_youtube_link: caseItem.modern_house_youtube_link,
        searchome_link: caseItem.searchome_link,
        gorgeous_space_link: caseItem.gorgeous_space_link,
        modernHouseYoutubeExists,
        searchomeVideoExists,
        gorgeousSpaceVideoExists,
        recommendation,
        warning,
      });
    }

    let report = \'批量檢查報告：\n\n\';
    results.forEach(r => {
      report += `案例名稱: ${r.case_name}\n`;
      report += `  摩登雅舍YouTube連結: ${r.modern_house_youtube_link || \'無\'}\n`;
      report += `  設計家連結: ${r.searchome_link || \'無\'}\n`;
      report += `  幸福空間連結: ${r.gorgeous_space_link || \'無\'}\n`;
      report += `  摩登雅舍YouTube是否存在: ${r.modernHouseYoutubeExists ? \'是\' : \'否\'}\n`;
      report += `  設計家影片是否存在: ${r.searchomeVideoExists ? \'是\' : \'否\'}\n`;
      report += `  幸福空間影片是否存在: ${r.gorgeousSpaceVideoExists ? \'是\' : \'否\'}\n`;
      report += `  建議: ${r.recommendation}\n`;
      if (r.warning) report += `  ${r.warning}\n`;
      report += \'------------------------------------\n\';
    });

    alert(report);
  };

  const filteredCases = cases.filter(caseItem =>
    caseItem.case_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.remarks.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 統計資料
  const stats = {
    total: cases.length,
    uploaded: cases.filter(c => c.uploaded_to_modern_house).length,
    pending: cases.filter(c => !c.uploaded_to_modern_house && (c.searchome_link || c.gorgeous_space_link)).length,
    searchome: cases.filter(c => c.searchome_link).length,
    gorgeous: cases.filter(c => c.gorgeous_space_link).length,
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>摩登雅舍影片管理系統</h1>
        <p>管理您的裝修案例影片連結，避免重複上傳</p>
        <span className={`api-status ${apiStatus}`}>
          API狀態: {apiStatus === \'connected\' ? \'已連接\' : \'未連接\'}
        </span>
      </header>

      <section className="stats-container">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">總案例數</div>
        </div>
        <div className="stat-card uploaded">
          <div className="stat-number">{stats.uploaded}</div>
          <div className="stat-label">已上傳</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">待上傳</div>
        </div>
        <div className="stat-card searchome">
          <div className="stat-number">{stats.searchome}</div>
          <div className="stat-label">設計家影片</div>
        </div>
        <div className="stat-card gorgeous">
          <div className="stat-number">{stats.gorgeous}</div>
          <div className="stat-label">幸福空間影片</div>
        </div>
      </section>

      <nav className="tab-container">
        <button
          className={`tab ${currentTab === \'addEdit\' ? \'active\' : \'\'}`}
          onClick={() => {
            setCurrentTab(\'addEdit\');
            setEditingCase(null); // 切換到新增頁面時清空編輯狀態
          }}
        >
          新增/編輯案例
        </button>
        <button
          className={`tab ${currentTab === \'list\' ? \'active\' : \'\'}`}
          onClick={() => setCurrentTab(\'list\')}
        >
          案例列表
        </button>
      </nav>

      {currentTab === \'addEdit\' && (
        <section className="form-container">
          <h2>{editingCase ? \'編輯案例\' : \'新增案例\'}</h2>
          <p>填寫案例資訊和相關影片連結</p>
          <form onSubmit={addOrUpdateCase} className="case-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="case_name">案例名稱 *</label>
                <input
                  type="text"
                  id="case_name"
                  name="case_name"
                  defaultValue={editingCase ? editingCase.case_name : \'\'}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="modern_house_youtube_link">摩登雅舍YouTube連結</label>
                <input
                  type="url"
                  id="modern_house_youtube_link"
                  name="modern_house_youtube_link"
                  defaultValue={editingCase ? editingCase.modern_house_youtube_link : \'\'}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="searchome_link">設計家影片連結</label>
                <input
                  type="url"
                  id="searchome_link"
                  name="searchome_link"
                  defaultValue={editingCase ? editingCase.searchome_link : \'\'}
                  placeholder="https://www.searchome.net/video..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="gorgeous_space_link">幸福空間影片連結</label>
                <input
                  type="url"
                  id="gorgeous_space_link"
                  name="gorgeous_space_link"
                  defaultValue={editingCase ? editingCase.gorgeous_space_link : \'\'}
                  placeholder="https://hhh.com.tw/video..."
                />
              </div>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="uploaded_to_modern_house"
                name="uploaded_to_modern_house"
                defaultChecked={editingCase ? editingCase.uploaded_to_modern_house : false}
              />
              <label htmlFor="uploaded_to_modern_house">已上傳至摩登雅舍YouTube</label>
            </div>
            <div className="form-group">
              <label htmlFor="remarks">備註</label>
              <textarea
                id="remarks"
                name="remarks"
                rows="4"
                defaultValue={editingCase ? editingCase.remarks : \'\'}
                placeholder="輸入任何相關備註 ，例如風格、坪數、設計重點等..."
              ></textarea>
            </div>
            <button type="submit" className="submit-btn">
              {editingCase ? \'更新案例\' : \'新增案例\'}
            </button>
          </form>
        </section>
      )}

      {currentTab === \'list\' && (
        <section className="list-container">
          <div className="list-header">
            <h2>案例列表</h2>
            <p>管理所有裝修案例的影片資訊</p>
            <div className="list-actions">
              <button onClick={handleExport} className="action-btn export">
                匯出資料
              </button>
              <label htmlFor="import-file" className="action-btn import">
                匯入資料
                <input
                  type="file"
                  id="import-file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: \'none\' }}
                />
              </label>
              <button onClick={handleBatchCheck} className="action-btn check" disabled={apiStatus !== \'connected\'}>
                批量檢查影片
              </button>
            </div>
          </div>

          <div className="search-container">
            <input
              type="text"
              placeholder="搜尋案例名稱或備註..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="cases-table">
            {filteredCases.length === 0 ? (
              <p className="empty-state">沒有找到任何案例。</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>案例名稱</th>
                    <th>摩登雅舍YouTube</th>
                    <th>設計家</th>
                    <th>幸福空間</th>
                    <th>狀態</th>
                    <th>備註</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((caseItem) => (
                    <tr key={caseItem.id}>
                      <td>{caseItem.case_name}</td>
                      <td>
                        <div className="video-sources">
                          {caseItem.modern_house_youtube_link ? (
                            <a href={caseItem.modern_house_youtube_link} target="_blank" rel="noopener noreferrer" className="source-link modern">
                              YouTube
                            </a>
                          ) : \'無\'}
                        </div>
                      </td>
                      <td>
                        <div className="video-sources">
                          {caseItem.searchome_link ? (
                            <a href={caseItem.searchome_link} target="_blank" rel="noopener noreferrer" className="source-link searchome">
                              設計家
                            </a>
                          ) : \'無\'}
                        </div>
                      </td>
                      <td>
                        <div className="video-sources">
                          {caseItem.gorgeous_space_link ? (
                            <a href={caseItem.gorgeous_space_link} target="_blank" rel="noopener noreferrer" className="source-link gorgeous">
                              幸福空間
                            </a>
                          ) : \'無\'}
                        </div>
                      </td>
                      <td>
                        <span className={`status ${caseItem.uploaded_to_modern_house ? \'uploaded\' : \'pending\'}`}>
                          {caseItem.uploaded_to_modern_house ? \'已上傳\' : \'待上傳\'}
                        </span>
                      </td>
                      <td>{caseItem.remarks}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => editCase(caseItem)} className="edit-btn">編輯</button>
                          <button onClick={() => deleteCase(caseItem.id)} className="delete-btn">刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
