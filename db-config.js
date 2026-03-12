// ========== Data Configuration Central ==========

// Your Google Sheets App Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbxEEjoK_DEeK0mfxd3pwqtWVb-ZQY_IQJ8Tm75OG2TUJ9e9BieWoZMywXm23bcsiA9C/exec";

// The secret key we just set to block anonymous spam.
const SCRIPT_SECRET = "sk_my_super_secret_survey_key_007";

const DB = {
  // Fetch existing rows (GET)
  async getRows() {
    try {
      const res = await fetch(`${API_URL}?secretKey=${SCRIPT_SECRET}`);
      if (!res.ok) throw new Error("Failed to fetch from Google Sheets API");
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      // Maps array of arrays to array of objects
      const mapComplaints = (rows) => {
        // Skip header row if exists (assumes UUID is first col, so check length of cols > 1)
        const entries = rows.length > 0 && rows[0][0] === 'id' ? rows.slice(1) : rows;
        return entries.map(row => ({
          id: row[0],
          created_at: row[1],
          name: row[2],
          email: row[3],
          type: row[4],
          message: row[5],
          ticket_id: row[6],
          status: row[7],
          rca: row[8] || "",
          capa: row[9] || "",
          isComplaint: true
        }));
      };

      const mapSurveys = (rows) => {
        const entries = rows.length > 0 && rows[0][0] === 'id' ? rows.slice(1) : rows;
        return entries.map(row => ({
          id: row[0],
          created_at: row[1],
          name: row[2],
          email: row[3],
          quality: row[4],
          ease: row[5],
          recommend: row[6],
          nps_score: row[7],
          feedback: row[8],
          isComplaint: false
        }));
      };

      return {
        complaints: mapComplaints(data.complaints || []),
        surveys: mapSurveys(data.surveys || [])
      };
    } catch (e) {
      console.error(e);
      return { complaints: [], surveys: [] };
    }
  },

  // Insert a new row (POST)
  async insertRow(table, recordData) {
    recordData.secretKey = SCRIPT_SECRET;
    recordData.table = table;
    recordData.action = "insert";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(recordData)
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Update an existing complaint row (POST)
  async updateComplaint(id, updates) {
    const payload = {
      secretKey: SCRIPT_SECRET,
      table: "Complaints",
      action: "update",
      id: id,
      status: updates.status,
      rca: updates.rca,
      capa: updates.capa
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }
};

window.DB = DB;
