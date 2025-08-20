function clearData() {
  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?")) {
    localStorage.clear(); 
    alert("ล้างข้อมูลเรียบร้อยแล้ว");
    location.reload();
  }
}