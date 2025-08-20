// Initialize classroom data
const classrooms = [];
const gradeConfig = [
    { grade: 1, name: 'ม.1', count: 15 },
    { grade: 2, name: 'ม.2', count: 15 },
    { grade: 3, name: 'ม.3', count: 15 },
    { grade: 4, name: 'ม.4', count: 12 },
    { grade: 5, name: 'ม.5', count: 12 },
    { grade: 6, name: 'ม.6', count: 11 }
];

let currentQuickUpdateClassroom = null;
let currentImageGallery = [];
let currentImageIndex = 0;
let pendingSaveAction = null;

// Image handling functions with proper isolation
function handleImageUpload(file, classroomId) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        // Create a new FileReader for each file to prevent conflicts
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create isolated image data for this specific classroom
            const imageData = e.target.result;
            resolve(imageData);
        };
        reader.onerror = function() {
            reject('เกิดข้อผิดพลาดในการอ่านไฟล์');
        };
        reader.readAsDataURL(file);
    });
}

function handleMultipleImageUpload(files, classroomId) {
    // Process files sequentially to prevent conflicts and ensure proper isolation
    const fileArray = Array.from(files).slice(0, 5);
    return Promise.all(fileArray.map((file, index) => {
        return new Promise((resolve) => {
            // Add a small delay between processing files to prevent race conditions
            setTimeout(() => {
                handleImageUpload(file, `${classroomId}_${index}_${Date.now()}`).then(resolve).catch(() => resolve(null));
            }, index * 10);
        });
    }));
}

function showImageGallery(classroomId, startIndex = 0) {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom || !classroom.images || classroom.images.length === 0) return;

    currentImageGallery = classroom.images;
    currentImageIndex = startIndex;
    
    updateImageGalleryDisplay();
    document.getElementById('imageModalTitle').textContent = `ห้อง ${classroomId}`;
    document.getElementById('imageModal').classList.remove('hidden');
}

function updateImageGalleryDisplay() {
    if (currentImageGallery.length === 0) return;

    const modalImage = document.getElementById('modalImage');
    const imageCounter = document.getElementById('imageCounter');
    const imageThumbnails = document.getElementById('imageThumbnails');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');

    // Update main image
    modalImage.src = currentImageGallery[currentImageIndex];
    
    // Update counter
    imageCounter.textContent = `${currentImageIndex + 1} / ${currentImageGallery.length}`;
    
    // Update navigation buttons
    prevBtn.disabled = currentImageIndex === 0;
    nextBtn.disabled = currentImageIndex === currentImageGallery.length - 1;
    prevBtn.className = currentImageIndex === 0 ? 
        'bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed' : 
        'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg';
    nextBtn.className = currentImageIndex === currentImageGallery.length - 1 ? 
        'bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed' : 
        'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg';

    // Update thumbnails
    imageThumbnails.innerHTML = currentImageGallery.map((img, index) => `
        <img src="${img}" alt="รูปที่ ${index + 1}" 
             class="w-16 h-16 object-cover rounded border-2 cursor-pointer transition-all ${index === currentImageIndex ? 'border-indigo-500 opacity-100' : 'border-gray-300 opacity-70 hover:opacity-100'}"
             onclick="currentImageIndex = ${index}; updateImageGalleryDisplay();">
    `).join('');

    // Hide navigation if only one image
    const navigation = document.getElementById('imageNavigation');
    navigation.style.display = currentImageGallery.length > 1 ? 'flex' : 'none';
}

function deleteExistingImage(classroomId, imageIndex) {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom || !classroom.images || imageIndex < 0 || imageIndex >= classroom.images.length) return;

    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรูปภาพนี้?')) {
        // Remove the image from the array
        classroom.images.splice(imageIndex, 1);
        
        // Save the updated data
        saveData();
        
        // Update all displays
        showExistingImages(classroomId);
        renderDashboard();
        renderAdminPanel();
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMsg.textContent = '✅ ลบรูปภาพเรียบร้อยแล้ว';
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 2000);
    }
}

function showExistingImages(classroomId) {
    const classroom = classrooms.find(c => c.id === classroomId);
    const existingImagesSection = document.getElementById('quickUpdateExistingImages');
    const existingImagesGrid = document.getElementById('existingImagesGrid');

    if (!classroom || !classroom.images || classroom.images.length === 0) {
        existingImagesSection.classList.add('hidden');
        return;
    }

    existingImagesSection.classList.remove('hidden');
    existingImagesGrid.innerHTML = classroom.images.map((img, index) => `
        <div class="relative group" id="image-${classroomId}-${index}">
            <img src="${img}" alt="รูปที่ ${index + 1}" class="w-full h-20 object-cover rounded border">
            <button 
                onclick="deleteExistingImage('${classroomId}', ${index})"
                class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all hover:scale-110"
                title="ลบรูปภาพ"
            >
                ×
            </button>
            <div class="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">${index + 1}</div>
        </div>
    `).join('');
}

function previewSelectedImages() {
    const fileInput = document.getElementById('quickUpdateAdminImage');
    const preview = document.getElementById('quickUpdateImagePreview');
    const files = Array.from(fileInput.files).slice(0, 5);

    if (files.length === 0) {
        preview.classList.add('hidden');
        return;
    }

    preview.classList.remove('hidden');
    preview.innerHTML = '';

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'relative';
            div.innerHTML = `
                <img src="${e.target.result}" alt="รูปที่ ${index + 1}" class="w-full h-20 object-cover rounded border">
                <div class="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">${index + 1}</div>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });

    if (files.length === 5) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'col-span-2 text-center text-xs text-orange-600 bg-orange-50 p-2 rounded';
        warningDiv.textContent = '⚠️ เลือกได้สูงสุด 5 รูป (รูปเกินจะถูกตัดออก)';
        preview.appendChild(warningDiv);
    }
}

// Generate classroom data with proper isolation
gradeConfig.forEach(config => {
    for (let i = 1; i <= config.count; i++) {
        classrooms.push({
            id: `${config.name}/${i}`,
            grade: config.grade,
            gradeName: config.name,
            room: i,
            score: null, // Start with no score
            lastUpdated: 'ยังไม่อัปเดต',
            images: [] // Each classroom gets its own isolated image array
        });
    }
});

// Load saved data from localStorage with proper isolation
function loadSavedData() {
    const saved = localStorage.getItem('classroomScoresThai');
    if (saved) {
        const savedData = JSON.parse(saved);
        classrooms.forEach(classroom => {
            if (savedData[classroom.id]) {
                classroom.score = savedData[classroom.id].score;
                classroom.lastUpdated = savedData[classroom.id].lastUpdated;
                // Handle backward compatibility and ensure proper isolation
                if (savedData[classroom.id].images) {
                    classroom.images = [...savedData[classroom.id].images]; // Create a copy to prevent reference sharing
                } else if (savedData[classroom.id].image) {
                    classroom.images = [savedData[classroom.id].image];
                } else {
                    classroom.images = [];
                }
            }
        });
    }
}

// Save data to localStorage with proper isolation
function saveData() {
    const data = {};
    classrooms.forEach(classroom => {
        // Ensure each classroom has its own isolated image array
        data[classroom.id] = {
            score: classroom.score,
            lastUpdated: classroom.lastUpdated,
            images: classroom.images ? [...classroom.images] : [] // Create a copy to prevent reference sharing
        };
    });
    localStorage.setItem('classroomScoresThai', JSON.stringify(data));
}

// Get level info from score (Thai version)
function getLevelInfo(score) {
    if (score >= 100) return { level: 'excellent', text: 'ยอดเยี่ยม', emoji: '🏆', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (score >= 90) return { level: 'very-good', text: 'ดีเยี่ยม', emoji: '🌟', color: 'bg-green-100 border-green-400 text-green-800' };
    if (score >= 80) return { level: 'good', text: 'ดี', emoji: '🙂', color: 'bg-blue-100 border-blue-400 text-blue-800' };
    return { level: 'not-passed', text: 'ต้องปรับปรุง', emoji: '❌', color: 'bg-red-100 border-red-400 text-red-800' };
}

// Calculate statistics
function calculateStats() {
    const validScores = classrooms.filter(c => c.score !== null && c.score !== undefined);
    const stats = {
        excellent: validScores.filter(c => c.score >= 100).length,
        veryGood: validScores.filter(c => c.score >= 90 && c.score < 100).length,
        good: validScores.filter(c => c.score >= 80 && c.score < 90).length,
        notPassed: validScores.filter(c => c.score < 80).length
    };
    return stats;
}

// Render statistics
function renderStats() {
    const stats = calculateStats();
    const statsGrid = document.getElementById('statsGrid');
    
    statsGrid.innerHTML = `
        <div class="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="text-2xl">🏆</div>
            <div class="text-2xl font-bold text-yellow-800">${stats.excellent}</div>
            <div class="text-sm text-yellow-700">ยอดเยี่ยม</div>
        </div>
        <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div class="text-2xl">🌟</div>
            <div class="text-2xl font-bold text-green-800">${stats.veryGood}</div>
            <div class="text-sm text-green-700">ดีเยี่ยม</div>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div class="text-2xl">🙂</div>
            <div class="text-2xl font-bold text-blue-800">${stats.good}</div>
            <div class="text-sm text-blue-700">ดี</div>
        </div>
        <div class="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div class="text-2xl">❌</div>
            <div class="text-2xl font-bold text-red-800">${stats.notPassed}</div>
            <div class="text-sm text-red-700">ต้องปรับปรุง</div>
        </div>
    `;
}

// Render dashboard
function renderDashboard() {
    const grid = document.getElementById('classroomGrid');
    const gradeFilter = document.getElementById('gradeFilter').value;
    const levelFilter = document.getElementById('levelFilter').value;

    // Filter classrooms
    let filteredClassrooms = classrooms;
    if (gradeFilter) {
        filteredClassrooms = filteredClassrooms.filter(c => c.grade == gradeFilter);
    }
    if (levelFilter) {
        filteredClassrooms = filteredClassrooms.filter(c => {
            if (c.score === null || c.score === undefined) return false;
            return getLevelInfo(c.score).level === levelFilter;
        });
    }

    // Group by grade
    const groupedByGrade = {};
    filteredClassrooms.forEach(classroom => {
        if (!groupedByGrade[classroom.grade]) {
            groupedByGrade[classroom.grade] = [];
        }
        groupedByGrade[classroom.grade].push(classroom);
    });

    let html = '';
    Object.keys(groupedByGrade).sort((a, b) => a - b).forEach(grade => {
        const gradeData = gradeConfig.find(g => g.grade == grade);
        html += `
            <div class="fade-in">
                <h3 class="text-2xl font-bold text-gray-800 mb-4 flex items-center flex-wrap">
                    📚 ${gradeData.name}
                    <span class="ml-3 text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                        ${groupedByGrade[grade].length} ห้อง
                    </span>
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
        `;

        groupedByGrade[grade].sort((a, b) => a.room - b.room).forEach(classroom => {
            // Handle empty state
            if (classroom.score === null || classroom.score === undefined) {
                html += `
                    <div class="score-card bg-white rounded-xl shadow-md border-2 border-gray-300 p-4">
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-800 mb-1">${classroom.id}</div>
                            <div class="text-3xl mb-2">📝</div>
                            <div class="text-lg text-gray-500 mb-1">-</div>
                            <div class="text-sm font-medium mb-3 text-gray-500">ยังไม่อัปเดต</div>
                            <div class="text-xs text-gray-400 mb-3">ไม่มีรูปภาพหลักฐาน</div>
                            <button 
                                class="update-btn w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-lg font-medium transition-all"
                                onclick="showClassroomDetail('${classroom.id}')"
                            >
                                ดูข้อมูล
                            </button>
                            <div class="mt-2 text-xs text-gray-500">
                                อัพเดทล่าสุด: ${classroom.lastUpdated}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const levelInfo = getLevelInfo(classroom.score);
                html += `
                    <div class="score-card bg-white rounded-xl shadow-md border-2 ${levelInfo.color} p-4">
                        <div class="text-center">
                            <div class="text-xl font-bold text-gray-800 mb-1">${classroom.id}</div>
                            <div class="text-3xl mb-2">${levelInfo.emoji}</div>
                            <div class="text-2xl font-bold mb-1">${classroom.score}</div>
                            <div class="text-sm font-medium mb-3">${levelInfo.text}</div>
                            ${classroom.images && classroom.images.length > 0 ? `
                                <div class="mb-3">
                                    <div class="grid grid-cols-2 gap-1">
                                        ${classroom.images.slice(0, 4).map((img, index) => `
                                            <img src="${img}" alt="หลักฐานการตรวจสอบ ${index + 1}" class="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageGallery('${classroom.id}', ${index})">
                                        `).join('')}
                                    </div>
                                    <div class="text-xs text-green-600 mt-1">📷 ${classroom.images.length} รูปหลักฐาน</div>
                                </div>
                            ` : '<div class="text-xs text-gray-400 mb-3">ไม่มีรูปภาพหลักฐาน</div>'}
                            <button 
                                class="update-btn w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-lg font-medium transition-all"
                                onclick="showClassroomDetail('${classroom.id}')"
                            >
                                ดูข้อมูล
                            </button>
                            <div class="mt-2 text-xs text-gray-500">
                                อัพเดทล่าสุด: ${classroom.lastUpdated}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        html += '</div></div>';
    });

    if (html === '') {
        html = '<div class="text-center py-12"><div class="text-6xl mb-4">🔍</div><div class="text-xl text-gray-600">ไม่พบห้องเรียนที่ตรงกับเงื่อนไขการกรอง</div></div>';
    }

    grid.innerHTML = html;
    renderStats();
}

// Render admin panel
function renderAdminPanel() {
    const grid = document.getElementById('adminGrid');
    let html = '';

    gradeConfig.forEach(config => {
        const gradeClassrooms = classrooms.filter(c => c.grade === config.grade);
        
        gradeClassrooms.sort((a, b) => a.room - b.room).forEach(classroom => {
            // Handle empty state in admin panel
            const displayScore = classroom.score === null || classroom.score === undefined ? '' : classroom.score;
            const levelInfo = classroom.score === null || classroom.score === undefined ? 
                { emoji: '📝', text: 'ยังไม่อัปเดต', color: 'bg-gray-100 border-gray-300 text-gray-600' } : 
                getLevelInfo(classroom.score);
            
            html += `
                <div class="bg-gray-50 rounded-lg p-4 border">
                    <div class="text-center mb-3">
                        <div class="font-bold text-lg">${classroom.id}</div>
                        <div class="text-sm text-gray-600">${classroom.gradeName}</div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700">คะแนน (0-100)</label>
                        <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value="${displayScore}"
                            data-classroom="${classroom.id}"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                            placeholder="กรอกคะแนน"
                        >
                        <label class="block text-xs font-medium text-gray-700 mt-2">รูปภาพหลักฐาน</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            data-classroom="${classroom.id}"
                            class="w-full text-xs border border-gray-300 rounded-md p-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        >
                        <div class="text-center p-2 rounded text-sm ${levelInfo.color}">
                            ${levelInfo.emoji} ${levelInfo.text}
                        </div>
                        <div class="space-y-1">
                            <button 
                                class="w-full bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded font-medium transition-colors"
                                onclick="openQuickUpdateAdmin('${classroom.id}')"
                            >
                                แก้ไขข้อมูล
                            </button>
                            <button 
                                class="w-full bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded font-medium transition-colors"
                                onclick="clearIndividualData('${classroom.id}')"
                            >
                                🗑️ ล้างข้อมูลห้องนี้
                            </button>
                        </div>
                        <div class="text-xs text-gray-500 text-center mt-1">
                            อัพเดทล่าสุด: ${classroom.lastUpdated}
                        </div>
                    </div>
                </div>
            `;
        });
    });

    grid.innerHTML = html;

    // Add event listeners for real-time updates
    grid.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', function() {
            const score = parseInt(this.value) || null;
            let levelInfo;
            
            if (score === null || this.value === '') {
                levelInfo = { emoji: '📝', text: 'ยังไม่อัปเดต', color: 'bg-gray-100 border-gray-300 text-gray-600' };
            } else {
                levelInfo = getLevelInfo(score);
            }
            
            // Update the level display
            const levelDisplay = this.parentNode.querySelector('div:nth-child(3)');
            levelDisplay.className = `text-center p-2 rounded text-sm ${levelInfo.color}`;
            levelDisplay.textContent = `${levelInfo.emoji} ${levelInfo.text}`;
        });
    });
}

// Show classroom detail modal
function showClassroomDetail(classroomId) {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;

    currentQuickUpdateClassroom = classroom;
    
    document.getElementById('detailRoom').textContent = classroom.id;
    document.getElementById('detailGrade').textContent = classroom.gradeName;
    document.getElementById('detailLastUpdated').textContent = classroom.lastUpdated;
    
    // Handle empty state
    if (classroom.score === null || classroom.score === undefined) {
        document.getElementById('detailScore').textContent = '-';
        document.getElementById('detailLevel').textContent = 'ยังไม่อัปเดต';
        document.getElementById('detailEmoji').textContent = '📝';
        
        const scoreDisplay = document.getElementById('detailScoreDisplay');
        scoreDisplay.className = 'text-center p-4 rounded-lg bg-gray-100 border-gray-300 text-gray-600';
    } else {
        const levelInfo = getLevelInfo(classroom.score);
        document.getElementById('detailScore').textContent = classroom.score;
        document.getElementById('detailLevel').textContent = levelInfo.text;
        document.getElementById('detailEmoji').textContent = levelInfo.emoji;
        
        const scoreDisplay = document.getElementById('detailScoreDisplay');
        scoreDisplay.className = `text-center p-4 rounded-lg ${levelInfo.color}`;
    }
    
    // Handle images display
    const imageSection = document.getElementById('detailImageSection');
    const imageGrid = document.getElementById('detailImageGrid');
    
    if (classroom.images && classroom.images.length > 0) {
        imageSection.classList.remove('hidden');
        imageGrid.innerHTML = classroom.images.map((img, index) => `
            <img src="${img}" alt="หลักฐานการตรวจสอบ ${index + 1}" 
                 class="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" 
                 onclick="showImageGallery('${classroom.id}', ${index})">
        `).join('');
    } else {
        imageSection.classList.add('hidden');
    }
    
    // Reset to view mode
    showDetailViewMode();
    document.getElementById('classroomDetailModal').classList.remove('hidden');
}

// Detail modal mode management
function showDetailViewMode() {
    document.getElementById('detailViewMode').classList.remove('hidden');
}

// Open quick update modal for admin
function openQuickUpdateAdmin(classroomId) {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;

    currentQuickUpdateClassroom = classroom;
    
    document.getElementById('quickUpdateAdminRoom').textContent = classroom.id;
    document.getElementById('quickUpdateAdminGrade').textContent = classroom.gradeName;
    document.getElementById('quickUpdateAdminScore').value = classroom.score || '';
    
    // Clear file input and preview
    document.getElementById('quickUpdateAdminImage').value = '';
    document.getElementById('quickUpdateImagePreview').classList.add('hidden');
    
    // Show existing images
    showExistingImages(classroomId);
    
    updateQuickUpdateAdminPreview(classroom.score);
    document.getElementById('quickUpdateAdminModal').classList.remove('hidden');
}

// Update quick update admin preview
function updateQuickUpdateAdminPreview(score) {
    const preview = document.getElementById('quickUpdateAdminPreview');
    if (score === '' || score === null || score === undefined) {
        preview.innerHTML = '<div class="text-lg font-medium text-gray-500">กรอกคะแนนเพื่อดูผล</div>';
        preview.className = 'text-center p-3 rounded-lg bg-gray-100';
        return;
    }

    const levelInfo = getLevelInfo(parseInt(score));
    preview.innerHTML = `
        <div class="text-2xl mb-1">${levelInfo.emoji}</div>
        <div class="text-lg font-bold">${score} คะแนน</div>
        <div class="text-md font-medium">${levelInfo.text}</div>
    `;
    preview.className = `text-center p-3 rounded-lg ${levelInfo.color}`;
}

// Clear individual classroom data
function clearIndividualData(classroomId) {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;

    const confirmMessage = `คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลของห้อง ${classroomId}? ข้อมูลคะแนนและรูปภาพจะถูกลบถาวร`;
    
    if (confirm(confirmMessage)) {
        // Clear individual classroom data
        classroom.score = null; // No value
        classroom.lastUpdated = 'ยังไม่อัปเดต';
        classroom.images = []; // Clear all images for this classroom
        classroom.image = null; // Clear legacy image field
        
        // Save updated data
        saveData();
        
        // Clear the corresponding admin panel input
        const adminInput = document.querySelector(`#adminGrid input[data-classroom="${classroomId}"]`);
        if (adminInput && adminInput.type === 'number') {
            adminInput.value = '';
        }
        
        // Re-render everything
        renderDashboard();
        renderAdminPanel();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="text-2xl mr-3">🗑️</div>
                <div>
                    <div class="font-bold">ล้างข้อมูลเรียบร้อย!</div>
                    <div class="text-sm">ห้อง ${classroomId} ถูกรีเซ็ตแล้ว</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Make functions globally available
window.showClassroomDetail = showClassroomDetail;
window.openQuickUpdateAdmin = openQuickUpdateAdmin;
window.showImageGallery = showImageGallery;
window.deleteExistingImage = deleteExistingImage;
window.clearIndividualData = clearIndividualData;

// Event listeners
document.getElementById('criteriaToggle').addEventListener('click', function() {
    document.getElementById('criteriaModal').classList.remove('hidden');
});

document.getElementById('closeCriteria').addEventListener('click', function() {
    document.getElementById('criteriaModal').classList.add('hidden');
});

document.getElementById('adminToggle').addEventListener('click', function() {
    document.getElementById('adminModal').classList.remove('hidden');
    // Reset to password screen
    document.getElementById('adminPasswordScreen').classList.remove('hidden');
    document.getElementById('adminControlPanel').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('passwordError').classList.add('hidden');
});

document.getElementById('closeAdmin').addEventListener('click', function() {
    document.getElementById('adminModal').classList.add('hidden');
    // Reset to password screen for next time
    document.getElementById('adminPasswordScreen').classList.remove('hidden');
    document.getElementById('adminControlPanel').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('passwordError').classList.add('hidden');
});

// Password verification
document.getElementById('submitPassword').addEventListener('click', function() {
    const password = document.getElementById('adminPassword').value;
    const correctPassword = '240640';
    
    if (password === correctPassword) {
        // Correct password - show admin panel
        document.getElementById('adminPasswordScreen').classList.add('hidden');
        document.getElementById('adminControlPanel').classList.remove('hidden');
        document.getElementById('passwordError').classList.add('hidden');
        renderAdminPanel();
    } else {
        // Wrong password - show error
        document.getElementById('passwordError').classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
});

// Allow Enter key to submit password
document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('submitPassword').click();
    }
});

document.getElementById('closeClassroomDetail').addEventListener('click', function() {
    document.getElementById('classroomDetailModal').classList.add('hidden');
});

document.getElementById('closeQuickUpdateAdmin').addEventListener('click', function() {
    document.getElementById('quickUpdateAdminModal').classList.add('hidden');
});

document.getElementById('closeImageModal').addEventListener('click', function() {
    document.getElementById('imageModal').classList.add('hidden');
});

// Image gallery navigation
document.getElementById('prevImage').addEventListener('click', function() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateImageGalleryDisplay();
    }
});

document.getElementById('nextImage').addEventListener('click', function() {
    if (currentImageIndex < currentImageGallery.length - 1) {
        currentImageIndex++;
        updateImageGalleryDisplay();
    }
});

// Image preview for file selection
document.getElementById('quickUpdateAdminImage').addEventListener('change', previewSelectedImages);

// Confirmation modal handlers
document.getElementById('confirmSave').addEventListener('click', function() {
    document.getElementById('confirmationModal').classList.add('hidden');
    if (pendingSaveAction) {
        pendingSaveAction();
        pendingSaveAction = null;
    }
});

document.getElementById('cancelConfirmation').addEventListener('click', function() {
    document.getElementById('confirmationModal').classList.add('hidden');
    pendingSaveAction = null;
});

document.getElementById('gradeFilter').addEventListener('change', renderDashboard);
document.getElementById('levelFilter').addEventListener('change', renderDashboard);

// Quick update admin score input listener
document.getElementById('quickUpdateAdminScore').addEventListener('input', function() {
    updateQuickUpdateAdminPreview(this.value);
});

// Save quick update admin
document.getElementById('saveQuickUpdateAdmin').addEventListener('click', async function() {
    if (!currentQuickUpdateClassroom) return;

    const scoreValue = document.getElementById('quickUpdateAdminScore').value;
    const score = scoreValue === '' ? null : parseInt(scoreValue);
    
    if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
        alert('กรุณากรอกคะแนนระหว่าง 0-100');
        return;
    }

    const imageFiles = document.getElementById('quickUpdateAdminImage').files;
    
    try {
        // Handle multiple image uploads
        let imageDataArray = [];
        if (imageFiles.length > 0) {
            imageDataArray = await handleMultipleImageUpload(imageFiles, currentQuickUpdateClassroom.id);
            imageDataArray = imageDataArray.filter(img => img !== null);
        }

        currentQuickUpdateClassroom.score = score;
        currentQuickUpdateClassroom.lastUpdated = score === null ? 'ยังไม่อัปเดต' : new Date().toLocaleDateString('th-TH');
        
        // Combine existing images with new images (max 5 total)
        if (imageDataArray.length > 0) {
            const existingImages = currentQuickUpdateClassroom.images || [];
            const allImages = [...existingImages, ...imageDataArray].slice(0, 5);
            currentQuickUpdateClassroom.images = allImages;
        }
        
        saveData();
        renderDashboard();
        renderAdminPanel();
        
        // Show success message
        const button = document.getElementById('saveQuickUpdateAdmin');
        const originalText = button.textContent;
        button.textContent = '✅ บันทึกแล้ว!';
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-green-800');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-800');
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            document.getElementById('quickUpdateAdminModal').classList.add('hidden');
        }, 1500);
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + error);
    }
});

document.getElementById('saveAll').addEventListener('click', async function() {
    const inputs = document.querySelectorAll('#adminGrid input[type="number"]');
    const fileInputs = document.querySelectorAll('#adminGrid input[type="file"]');
    const today = new Date().toLocaleDateString('th-TH');
    
    // Process score inputs
    inputs.forEach(input => {
        const classroomId = input.dataset.classroom;
        const scoreValue = input.value;
        const score = scoreValue === '' ? null : parseInt(scoreValue);
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
            classroom.score = score !== null ? Math.max(0, Math.min(100, score)) : null;
            classroom.lastUpdated = score === null ? 'ยังไม่อัปเดต' : today;
        }
    });

    // Process image uploads
    for (const fileInput of fileInputs) {
        const classroomId = fileInput.dataset.classroom;
        const file = fileInput.files[0];
        const classroom = classrooms.find(c => c.id === classroomId);
        
        if (file && classroom) {
            try {
                const imageData = await handleImageUpload(file, classroomId);
                if (imageData) {
                    classroom.image = imageData;
                }
            } catch (error) {
                console.error('Error uploading image for', classroomId, ':', error);
            }
        }
    }
    
    saveData();
    renderDashboard();
    
    // Show success message
    const button = this;
    const originalText = button.textContent;
    button.textContent = '✅ บันทึกแล้ว!';
    button.classList.remove('bg-green-600', 'hover:bg-green-700');
    button.classList.add('bg-green-800');
    setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-800');
        button.classList.add('bg-green-600', 'hover:bg-green-700');
    }, 2000);
});

// Updated clear all data function
document.getElementById('clearAllData').addEventListener('click', function() {
    const confirmMessage = 'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? ข้อมูลคะแนนและรูปภาพจะถูกลบถาวร';
    
    if (confirm(confirmMessage)) {
        // Clear localStorage completely
        localStorage.removeItem('classroomScoresThai');
        
        // Reset all classroom data to completely empty state
        classrooms.forEach(classroom => {
            classroom.score = null; // No value
            classroom.lastUpdated = 'ยังไม่อัปเดต';
            classroom.images = []; // Clear all images
            classroom.image = null; // Clear legacy image field
        });
        
        // Clear all admin panel inputs
        const adminInputs = document.querySelectorAll('#adminGrid input');
        adminInputs.forEach(input => {
            if (input.type === 'number') {
                input.value = '';
            } else if (input.type === 'file') {
                input.value = '';
            }
        });
        
        // Re-render everything immediately
        renderDashboard();
        renderAdminPanel();
        
        // Show success message
        const button = this;
        const originalText = button.textContent;
        button.textContent = '✅ ล้างข้อมูลเรียบร้อย!';
        button.classList.remove('bg-red-600', 'hover:bg-red-700');
        button.classList.add('bg-green-600');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bg-green-600');
            button.classList.add('bg-red-600', 'hover:bg-red-700');
        }, 2000);
    }
});

// Close modals when clicking outside
document.getElementById('criteriaModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.getElementById('adminModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.getElementById('classroomDetailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.getElementById('quickUpdateAdminModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.getElementById('imageModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
    }
});

document.getElementById('confirmationModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.add('hidden');
        pendingSaveAction = null;
    }
});

// Initialize the application
loadSavedData();
renderDashboard();
