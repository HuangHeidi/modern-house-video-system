import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [cases, setCases] = useState(() => {
    const savedCases = localStorage.getItem("modernHouseCases");
    return savedCases ? JSON.parse(savedCases) : [];
  });
  const [currentTab, setCurrentTab] = useState("addEdit");
  const [apiStatus, setApiStatus] = useState("disconnected");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCase, setEditingCase] = useState(null);

  useEffect(() => {
    localStorage.setItem("modernHouseCases", JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/cases");
      if (response.ok) {
        setApiStatus("connected");
      } else {
        setApiStatus("disconnected");
      }
    } catch (error) {
      setApiStatus("disconnected");
      console.error("API connection error:", error);
    }
  };

  const saveCases = (newCases) => {
    setCases(newCases);
    localStorage.setItem("modernHouseCases", JSON.stringify(newCases));
  };

  const addOrUpdateCase = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCase = {
      id: editingCase ? editingCase.id : Date.now().toString(),
      case_name: formData.get("case_name"),
      modern_house_youtube_link: formData.get("modern_house_youtube_link"),
      searchome_link: formData.get("searchome_link"),
      gorgeous_space_link: formData.get("gorgeous_space_link"),
      uploaded_to_modern_house: e.target.elements.uploaded_to_modern_house.checked,
      remarks: formData.get("remarks"),
    };

    if (editingCase) {
      const updatedCases = cases.map((c) =>
        c.id === newCase.id ? newCase : c
      );
      saveCases(updatedCases);
      setEditingCase(null);
      alert("案例更新成功！");
    } else {
      const updatedCases = [...cases, newCase];
      saveCases(updatedCases);
      alert("案例新增成功！");
    }
    e.target.reset();
  };

  const deleteCase = (id) => {
    if (confirm("確定要刪除此案例嗎？")) {
      const updatedCases = cases.filter(caseItem => caseItem.id !== id);
      saveCases(updatedCases);
    }
  };

  const editCase = (caseData) => {
    setEditingCase(caseData);
    setCurrentTab("addEdit");
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (Array.isArray(importedData)) {
            const existingCaseIds = new Set(cases.map(c => c.id));
            const newCases = importedData.filter(ic => !existingCaseIds.has(ic.id));
            const updatedCases = cases.map(ec => {
              const importedVersion = importedData.find(ic => ic.id === ec.id);
              return importedVersion ? importedVersion : ec;
            });
            saveCases([...updatedCases, ...newCases]);
            alert("資料匯入成功！");
          } else {
            alert("匯入檔案格式不正確，請確保是JSON陣列。");
          }
        } catch (error) {
          alert("解析檔案失敗，請確保是有效的JSON格式。");
          console.error("Import error:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(cases, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `摩登雅舍案例資料_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBatchCheck = async () => {
    if (apiStatus !== "connected") {
      alert("後端API未連接，無法執行批量檢查。請確保後端服務已啟動。");
      return;
    }

    const results = [];
    for (const caseItem of cases) {
      let modernHouseYoutubeExists = false;
      let searchomeVideoExists = false;
      let gorgeousSpaceVideoExists = false;

      if (caseItem.modern_house_youtube_link) {
        try {
          const response = await fetch("http://localhost:5000/api/youtube/check_channel_video_existence", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video_url: caseItem.modern_house_youtube_link,
              channel_id: "UCwTShuBukB8DsgvSSu_hpWg",
            }),
          });
          const data = await response.json();
          modernHouseYoutubeExists = data.exists_in_channel;
        } catch (error) {
          console.error(`檢查摩登雅舍YouTube連結失敗 (${caseItem.case_name}):`, error);
        }
      }

      if (caseItem.searchome_link) {
        try {
          new URL(caseItem.searchome_link);
          searchomeVideoExists = true;
        } catch {}
      }

      if (caseItem.gorgeous_space_link) {
        try {
          new URL(caseItem.gorgeous_space_link);
          gorgeousSpaceVideoExists = true;
        } catch {}
      }

      let recommendation = "無需特別處理";
      let warning = "";

      if (modernHouseYoutubeExists) {
        if (searchomeVideoExists || gorgeousSpaceVideoExists) {
          warning = "警告：影片已在摩登雅舍頻道，但設計家或幸福空間仍有連結，請確認是否為重複內容。";
        }
      } else {
        if (searchomeVideoExists || gorgeousSpaceVideoExists) {
          recommendation = "建議搬移：設計家或幸福空間有影片，但摩登雅舍頻道沒有，建議搬移。";
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

    let report = "批量檢查報告：\n\n";
    results.forEach(r => {
      report += `案例名稱: ${r.case_name}\n`;
      report += `  摩登雅舍YouTube連結: ${r.modern_house_youtube_link || "無"}\n`;
      report += `  設計家連結: ${r.searchome_link || "無"}\n`;
      report += `  幸福空間連結: ${r.gorgeous_space_link || "無"}\n`;
      report += `  摩登雅舍YouTube是否存在: ${r.modernHouseYoutubeExists ? "是" : "否"}\n`;
      report += `  設計家影片是否存在: ${r.searchomeVideoExists ? "是" : "否"}\n`;
      report += `  幸福空間影片是否存在: ${r.gorgeousSpaceVideoExists ? "是" : "否"}\n`;
      report += `  建議: ${r.recommendation}\n`;
      if (r.warning) report += `  ${r.warning}\n`;
      report += "------------------------------------\n";
    });

    alert(report);
  };

  return (
    <div className="app">
      <h1>摩登雅舍影片管理系統</h1>
      {/* 這裡可以再插入你的 UI layout */}
    </div>
  );
}

export default App;
