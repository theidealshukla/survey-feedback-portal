 const firebaseConfig = {
        apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
        authDomain: "smart-customer-support-portal.firebaseapp.com",
        projectId: "smart-customer-support-portal",
      };
      firebase.initializeApp(firebaseConfig);
      const db = firebase.firestore();

      firebase.auth().onAuthStateChanged((user) => {
        if (!user) window.location.href = "index.html";
      });

      function logout() {
        firebase
          .auth()
          .signOut()
          .then(() => (location.href = "index.html"));
      }

      function closeModal() {
        document.getElementById("viewModal").style.display = "none";
      }

      function getSentiment(text) {
        const positiveWords = [
          "great",
          "good",
          "excellent",
          "amazing",
          "happy",
          "love",
          "satisfied",
        ];
        const negativeWords = [
          "bad",
          "poor",
          "terrible",
          "unhappy",
          "hate",
          "worst",
          "delay",
          "issue",
        ];
        const lower = text.toLowerCase();
        let score = 0;

        positiveWords.forEach((word) => {
          if (lower.includes(word)) score += 1;
        });
        negativeWords.forEach((word) => {
          if (lower.includes(word)) score -= 1;
        });

        if (score > 0) return "Positive";
        if (score < 0) return "Negative";
        return "Neutral";
      }

      async function showModal(
        docId,
        isComplaint,
        _,
        currentStatus,
        data = {}
      ) {
        let sentiment = getSentiment(
          isComplaint ? data.message || "" : data.feedback || ""
        );

        document.getElementById("modalDetails").innerHTML = `
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        ${
          isComplaint
            ? `<p><strong>Ticket ID:</strong> <span style="color:#007bff">${
                data.ticketId || "N/A"
              }</span></p>`
            : ""
        }
        <p><strong>${isComplaint ? "Message" : "Feedback"}:</strong> ${
          isComplaint ? data.message : data.feedback || "-"
        }</p>
        <p><strong>Sentiment:</strong> ${sentiment}</p>
      `;

        if (isComplaint) {
          document.getElementById("statusUpdate").innerHTML = `
          <label>Status:</label>
          <select id="newStatus">
            <option value="open" ${
              currentStatus === "open" ? "selected" : ""
            }>Open</option>
            <option value="resolved" ${
              currentStatus === "resolved" ? "selected" : ""
            }>Resolved</option>
          </select>

          <label>Investigation Notes:</label>
          <textarea id="investigationNotes">${
            data.investigationNotes || ""
          }</textarea>

          <label>Root Cause (RCA):</label>
          <textarea id="rca">${data.rca || ""}</textarea>

          <label>Corrective/Preventive Action (CAPA):</label>
          <textarea id="capa">${data.capa || ""}</textarea>

          <button onclick="saveUpdate('${docId}')">Update</button>
        `;
        } else {
          document.getElementById("modalDetails").innerHTML += `
    <p><strong>Product Quality:</strong> ${data.quality || "-"}</p>
    <p><strong>Ease of Use:</strong> ${data.ease || "-"}</p>
    <p><strong>Would Recommend:</strong> ${data.recommend || "-"}</p>
    <p><strong>NPS Score:</strong> ${data.npsScore || "-"}</p>
    <p><strong>Additional Feedback:</strong> ${data.feedback || "-"}</p>
  `;
          document.getElementById("statusUpdate").innerHTML = "";
        }

        document.getElementById("viewModal").style.display = "flex";
      }

      async function saveUpdate(docId) {
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = "flex";

        try {
          const newStatus = document.getElementById("newStatus").value;
          const investigationNotes =
            document.getElementById("investigationNotes").value;
          const rca = document.getElementById("rca").value;
          const capa = document.getElementById("capa").value;

          await db.collection("complaints").doc(docId).update({
            status: newStatus,
            investigationNotes,
            rca,
            capa,
            updatedAt: new Date(),
          });

          closeModal();
          await loadDashboard();
        } catch (error) {
          console.error("Error saving update:", error);
        } finally {
          overlay.style.display = "none";
        }
      }

      async function loadDashboard() {
        // Show loading overlay
        const overlay = document.getElementById("loadingOverlay");
        overlay.style.display = "flex";

        // Reduce artificial delay from 2000ms to 1000ms
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          let total = 0,
            open = 0,
            resolvedToday = 0;
          let promoters = 0,
            passives = 0,
            detractors = 0,
            totalResponses = 0;

          const range = document.getElementById("exportRange").value;
          const start = document.getElementById("startDate").value;
          const end = document.getElementById("endDate").value;
          const filterFn = getDateFilterFn(range, start, end);

          const typeFilter = document.getElementById("filterType").value;
          const statusFilter = document.getElementById("filterStatus").value;
          const dataTable = document.getElementById("dataTable");
          dataTable.innerHTML = "";

          // Get complaints
          const complaints = await db.collection("complaints").get();
          complaints.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt?.toDate();

            // Skip if doesn't match date filter
            if (!date || !filterFn(date)) return;

            total++;
            if (data.status === "open") open++;
            if (
              data.status === "resolved" &&
              date.toISOString().startsWith(new Date().toISOString().split("T")[0])
            ) {
              resolvedToday++;
            }

            if (
              (typeFilter === "complaint" || typeFilter === "all") &&
              (statusFilter === data.status || statusFilter === "all")
            ) {
              const sentiment = getSentiment(data.message || "");

              // Add complaint row
              dataTable.innerHTML += `
            <tr>
              <td>${data.name}</td>
              <td>${data.email}</td>
              <td>Complaint</td>
              <td>
                <button class="status-pill ${
                  data.status === "open" ? "yellow" : "green"
                }">${data.status}</button>
              </td>
              <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
              <td><span class="sentiment ${sentiment.toLowerCase()}">${sentiment}</span></td>
              <td>
                <button class="btn" onclick='showModal("${
                  doc.id
                }", true, "", "${data.status}", ${JSON.stringify(
              data
            )})'>View</button>
              </td>
            </tr>
          `;
            }
          });

          // Get surveys with same date filtering
          const surveys = await db.collection("surveys").get();
          surveys.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt?.toDate();

            // Skip if doesn't match date filter
            if (!date || !filterFn(date)) return;

            total++;

            if (data.npsScore != null) {
              const score = parseInt(data.npsScore);
              totalResponses++;
              if (score >= 9) promoters++;
              else if (score >= 7) passives++;
              else detractors++;
            }

            if (typeFilter === "survey" || typeFilter === "all") {
              const sentiment = getSentiment(data.feedback || "");

              dataTable.innerHTML += `
            <tr>
              <td>${data.name}</td>
              <td>${data.email}</td>
              <td>Survey</td>
              <td><button class="status-pill blue">N/A</button></td>
              <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
              <td><span class="sentiment ${sentiment.toLowerCase()}">${sentiment}</span></td>
              <td>
                <button class="btn" onclick='showModal("${
                  doc.id
                }", false, "", "-", ${JSON.stringify(data)})'>View</button>
              </td>
            </tr>
          `;
            }
          });

          let nps = "-";
          if (totalResponses > 0) {
            nps = Math.round(((promoters - detractors) / totalResponses) * 100);
          }

          document.getElementById("totalSubmissions").innerText = total;
          document.getElementById("openTickets").innerText = open;
          document.getElementById("resolvedToday").innerText = resolvedToday;

          const avgNPS = document.getElementById("avgNPS");
          avgNPS.innerText = nps;

          if (nps === "-") {
            avgNPS.style.color = "#888";
          } else if (nps >= 70) {
            avgNPS.style.color = "green";
          } else if (nps >= 30) {
            avgNPS.style.color = "#ff9800";
          } else {
            avgNPS.style.color = "red";
          }
        } catch (error) {
          console.error("Error loading dashboard:", error);
        } finally {
          // Hide loading overlay
          overlay.style.display = "none";
        }
      }

      document.getElementById("exportRange").addEventListener("change", function () {
        const isCustom = this.value === "custom";
        const startDateEl = document.getElementById("startDate");
        const endDateEl = document.getElementById("endDate");
        
        // Show/hide date inputs
        startDateEl.style.display = isCustom ? "inline-block" : "none";
        endDateEl.style.display = isCustom ? "inline-block" : "none";
        
        // Set default dates when switching to custom
        if (isCustom) {
          const today = new Date().toISOString().split('T')[0];
          if (!startDateEl.value) startDateEl.value = today;
          if (!endDateEl.value) endDateEl.value = today;
        }
        
        loadDashboard();
      });

      // Add event listeners for date inputs
      document.getElementById("startDate").addEventListener("change", loadDashboard);
      document.getElementById("endDate").addEventListener("change", loadDashboard);

      // Update the getDateFilterFn function
      function getDateFilterFn(range, startDate, endDate) {
        const now = new Date();
        return function (d) {
          const date = new Date(d);
          
          switch(range) {
            case "today":
              return date.toDateString() === now.toDateString();
            case "week": {
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              return date >= startOfWeek && date <= now;
            }
            case "month":
              return date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
            case "year":
              return date.getFullYear() === now.getFullYear();
            case "custom": {
              if (!startDate || !endDate) return true;
              const start = new Date(startDate);
              const end = new Date(endDate);
              // Set end date to end of day
              end.setHours(23, 59, 59, 999);
              return date >= start && date <= end;
            }
            default:
              return true;
          }
        };
      }

      function exportToCSV() {
        const range = document.getElementById("exportRange").value;
        const start = document.getElementById("startDate").value;
        const end = document.getElementById("endDate").value;
        const filterFn = getDateFilterFn(range, start, end);

        // CSV Headers
        let csvContent = "Name,Email,Type,Status,Date,Sentiment,Details\n";

        // Get all complaints and surveys
        Promise.all([
          db.collection("complaints").get(),
          db.collection("surveys").get()
        ]).then(([complaints, surveys]) => {
          // Process complaints
          complaints.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate();
            if (!date || !filterFn(date)) return;

            const sentiment = getSentiment(data.message || "");
            const row = [
              data.name,
              data.email,
              "Complaint",
              data.status,
              date.toLocaleDateString(),
              sentiment,
              `"${(data.message || "").replace(/"/g, '""')}"` // Escape quotes in message
            ];
            csvContent += row.join(",") + "\n";
          });

          // Process surveys
          surveys.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt?.toDate();
            if (!date || !filterFn(date)) return;

            const sentiment = getSentiment(data.feedback || "");
            const details = `NPS: ${data.npsScore || "N/A"}, Quality: ${data.quality || "N/A"}, Ease: ${data.ease || "N/A"}`;
            const row = [
              data.name,
              data.email,
              "Survey",
              "N/A",
              date.toLocaleDateString(),
              sentiment,
              `"${details.replace(/"/g, '""')}"` // Escape quotes in details
            ];
            csvContent += row.join(",") + "\n";
          });

          // Create and trigger download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `export_${range}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      loadDashboard();