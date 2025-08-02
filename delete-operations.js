async function deleteSelected() {
  const selectedRows = document.querySelectorAll('input[name="rowSelect"]:checked');
  
  if (selectedRows.length === 0) {
    alert('Please select items to delete');
    return;
  }

  if (!confirm(`Are you sure you want to delete ${selectedRows.length} selected items?`)) {
    return;
  }

  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = "flex";

  try {
    for (const checkbox of selectedRows) {
      const { docId, type } = checkbox.dataset;
      await db.collection(type === 'Complaint' ? 'complaints' : 'surveys')
        .doc(docId)
        .delete();
    }
    
    await loadDashboard();
  } catch (error) {
    console.error('Delete error:', error);
    alert('Error deleting items: ' + error.message);
  } finally {
    overlay.style.display = "none";
  }
}

async function deleteAll() {
  if (!confirm('⚠️ WARNING: This will permanently delete ALL data. Are you sure?')) {
    return;
  }
  
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = "flex";

  try {
    const collections = ['complaints', 'surveys'];
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    }

    await loadDashboard();
  } catch (error) {
    console.error('Delete error:', error);
    alert('Error deleting data: ' + error.message);
  } finally {
    overlay.style.display = "none";
  }
}

function toggleSelectAll() {
  const selectAll = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('input[name="rowSelect"]');
  checkboxes.forEach(checkbox => checkbox.checked = selectAll.checked);
}