const app = {
    evaluations: [], sectors: [], tempPhotos: [],
    db: null, dbLocal: null,
    currentLocation: "", collectionName: "",
    adminUser: "vev", adminPass: "ford123", // SENHA DE ACESSO

    // ⚠️ COLE AS CHAVES DO SEU NOVO PROJETO AQUI ⚠️
    firebaseConfig: {
        apiKey: "COLE_AQUI",
        authDomain: "COLE_AQUI",
        projectId: "COLE_AQUI",
        storageBucket: "COLE_AQUI",
        messagingSenderId: "COLE_AQUI",
        appId: "COLE_AQUI"
    },

    // --- AS PERGUNTAS DO SEU FORMULÁRIO ---
    checklistItems: [
        { id: "c1", category: "NVH (Noise, Vibration)", text: "Wind noise acceptable at 120km/h?" },
        { id: "c2", category: "NVH (Noise, Vibration)", text: "Squeaks and rattles on rough road?" },
        { id: "c3", category: "Dynamics", text: "Transmission shift smoothness?" },
        { id: "c4", category: "Dynamics", text: "Brake pedal feel and stopping power?" },
        { id: "c5", category: "Interior / Exterior", text: "Panel fit, gaps and flushness acceptable?" }
    ],

    async initApp() {
        if (!firebase.apps.length) firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.firestore();
        await this.loadSectors();
    },

    checkLogin() {
        const u = document.getElementById('login-user').value;
        const p = document.getElementById('login-pass').value;
        if (u === this.adminUser && p === this.adminPass) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('location-screen').style.display = 'flex';
            this.renderSectorButtons();
        } else { alert("Invalid Credentials"); }
    },

    // --- PROGRAMAS ---
    async loadSectors() {
        try {
            const snap = await this.db.collection('config_programs').get();
            if (snap.empty) {
                const defaults = ['RANGER (P703)', 'BRONCO SPORT', 'MAVERICK'];
                for(const sec of defaults) await this.db.collection('config_programs').doc(sec).set({name: sec});
                this.sectors = defaults;
            } else {
                this.sectors = [];
                snap.forEach(doc => this.sectors.push(doc.data().name));
            }
            this.renderSectorButtons();
        } catch (e) {
            this.sectors = ['RANGER', 'BRONCO'];
            this.renderSectorButtons();
        }
    },

    async addSector() {
        const name = document.getElementById('new-sector-name').value.toUpperCase().trim();
        if(!name) return;
        try {
            await this.db.collection('config_programs').doc(name).set({name: name});
            this.sectors.push(name);
            this.renderSectorButtons();
            document.getElementById('new-sector-name').value = '';
        } catch (e) { alert("Error saving program."); }
    },

    renderSectorButtons() {
        const list = document.getElementById('sector-list');
        const nav = document.getElementById('nav-sector');
        if(!list) return;
        list.innerHTML = '';
        nav.innerHTML = '<option value="" disabled selected>Program</option>';
        this.sectors.forEach(sec => {
            const btn = document.createElement('button');
            btn.className = 'btn-location';
            btn.innerHTML = `<span class="material-icons" style="font-size:30px; margin-bottom:5px;">directions_car</span><br>${sec}`;
            btn.style = "background:var(--ford-blue); color:white; border:none; padding:20px; border-radius:8px; cursor:pointer;";
            btn.onclick = () => this.selectLocation(sec);
            list.appendChild(btn);

            const opt = document.createElement('option');
            opt.value = sec; opt.innerText = sec; nav.appendChild(opt);
        });
    },

    selectLocation(loc) {
        this.switchLocation(loc);
        document.getElementById('location-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    },

    switchLocation(loc) {
        this.currentLocation = loc;
        this.collectionName = `evals_${loc.replace(/[^a-zA-Z0-9]/g, '')}`;
        document.getElementById('nav-sector').value = loc;
        document.getElementById('loading-msg').style.display = 'block';
        document.getElementById('vehicle-list').innerHTML = '';
        this.initDatabaseListeners(); 
    },

    async initDatabaseListeners() {
        try {
            this.db.collection(this.collectionName).onSnapshot((snap) => {
                document.getElementById('loading-msg').style.display = 'none';
                this.evaluations = [];
                snap.forEach(doc => this.evaluations.push(doc.data()));
                this.renderList();
            });
        } catch (e) { console.error(e); }
    },

    // --- LISTAGEM ---
    renderList() {
        const c = document.getElementById('vehicle-list'); c.innerHTML = '';
        if(!this.evaluations.length) { c.innerHTML = '<p style="text-align:center; padding:20px;">No evaluations yet.</p>'; return; }
        
        this.evaluations.sort((a,b) => new Date(b.date) - new Date(a.date));

        this.evaluations.forEach(ev => {
            const div = document.createElement('div');
            div.style = "background:white; padding:15px; margin-bottom:10px; border-radius:8px; border-left:5px solid var(--ford-blue); box-shadow:0 2px 5px rgba(0,0,0,0.1);";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <strong style="font-size:1.1rem; color:var(--ford-blue);">${ev.vin}</strong>
                    <span style="color:#666; font-size:0.9rem;">${this.fmtDate(ev.date)}</span>
                </div>
                <div style="font-size:0.9rem; color:#555; margin-bottom:10px;">
                    Test: <b>${ev.testType}</b> | Km: ${ev.km}
                </div>
                <button onclick="app.openEvaluationModal(${ev.id})" style="background:#e9ecef; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; width:100%; font-weight:bold;">View / Edit Eval</button>
            `;
            c.appendChild(div);
        });
    },

    // --- FORMULÁRIO DINÂMICO ---
    buildDynamicForm(savedAnswers = {}) {
        const container = document.getElementById('dynamic-forms-container');
        container.innerHTML = '';
        const categories = [...new Set(this.checklistItems.map(q => q.category))];

        categories.forEach(cat => {
            const catHeader = document.createElement('div');
            catHeader.style = "margin-top: 15px; margin-bottom:10px; color: #555; border-bottom: 2px solid var(--ford-blue); font-weight:bold;";
            catHeader.innerText = cat;
            container.appendChild(catHeader);

            const questions = this.checklistItems.filter(q => q.category === cat);
            questions.forEach(q => {
                const val = savedAnswers[q.id] || '';
                const qDiv = document.createElement('div');
                qDiv.className = 'eval-question';
                qDiv.innerHTML = `
                    <h4>${q.text}</h4>
                    <div class="eval-options">
                        <input type="radio" name="q_${q.id}" id="pass_${q.id}" value="PASS" ${val==='PASS'?'checked':''}>
                        <label for="pass_${q.id}" class="pass">PASS</label>
                        
                        <input type="radio" name="q_${q.id}" id="mon_${q.id}" value="MONITOR" ${val==='MONITOR'?'checked':''}>
                        <label for="mon_${q.id}" class="monitor">MONITOR</label>
                        
                        <input type="radio" name="q_${q.id}" id="fail_${q.id}" value="FAIL" ${val==='FAIL'?'checked':''}>
                        <label for="fail_${q.id}" class="fail">FAIL</label>
                    </div>
                `;
                container.appendChild(qDiv);
            });
        });
    },

    openNewEvaluation() {
        this.tempPhotos = [];
        document.getElementById('vehicle-form').reset();
        document.getElementById('veh-id').value = "";
        document.getElementById('f-manu-ultima').value = new Date().toISOString().split('T')[0];
        document.getElementById('image-preview-container').innerHTML = '';
        this.buildDynamicForm({});
        document.getElementById('modal').style.display = 'flex';
    },

    openEvaluationModal(id) {
        const ev = this.evaluations.find(x => x.id == id);
        this.tempPhotos = ev.photos || [];
        document.getElementById('veh-id').value = ev.id;
        document.getElementById('f-placa').value = ev.vin;
        document.getElementById('f-modelo').value = ev.testType;
        document.getElementById('f-km').value = ev.km;
        document.getElementById('f-manu-ultima').value = ev.date;
        document.getElementById('f-obs').value = ev.comments || '';
        
        this.buildDynamicForm(ev.answers || {});
        this.renderImagePreviews();
        document.getElementById('modal').style.display = 'flex';
    },

    // --- SALVAR AVALIAÇÃO (USANDO BASE64 DIRETO NO BANCO) ---
    async saveEvaluation(e) {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-veh');
        if(btnSave) { btnSave.disabled = true; btnSave.innerText = "Saving..."; }

        try {
            let id = document.getElementById('veh-id').value || Date.now();
            
            // Coleta respostas
            let answers = {};
            this.checklistItems.forEach(q => {
                const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
                if(selected) answers[q.id] = selected.value;
            });

            const evData = {
                id: parseInt(id),
                vin: document.getElementById('f-placa').value.toUpperCase(),
                testType: document.getElementById('f-modelo').value,
                km: document.getElementById('f-km').value,
                date: document.getElementById('f-manu-ultima').value,
                comments: document.getElementById('f-obs').value,
                answers: answers,
                photos: [...this.tempPhotos], // Salva direto em Base64 como antes
                evaluator: document.getElementById('login-user').value
            };

            await this.db.collection(this.collectionName).doc(String(id)).set(evData);
            this.closeModal();
            alert("Evaluation Saved!");
        } catch(err) {
            alert("Error: " + err.message);
        } finally {
            if(btnSave) { btnSave.disabled = false; btnSave.innerText = "Save Eval"; }
        }
    },

    // --- PDF DE COMPARTILHAMENTO ---
    async generateEvaluationPDF() {
        const vin = document.getElementById('f-placa').value.toUpperCase();
        if(!vin) return alert("Please fill at least the VIN.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cabeçalho
        doc.setFillColor(0, 52, 120); 
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text("VEV GLOBAL - OFFICIAL REPORT", 105, 18, {align:"center"});
        
        doc.setTextColor(0);
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("VEHICLE INFORMATION", 14, 40);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Program: ${this.currentLocation}`, 14, 47);
        doc.text(`Prototype VIN: ${vin}`, 14, 53);
        doc.text(`Test Type: ${document.getElementById('f-modelo').value}`, 14, 59);
        doc.text(`Mileage: ${document.getElementById('f-km').value} km`, 105, 47);
        doc.text(`Date: ${this.fmtDate(document.getElementById('f-manu-ultima').value)}`, 105, 53);
        doc.text(`Evaluator: ${document.getElementById('login-user').value}`, 105, 59);

        // Checklist
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("EVALUATION CHECKLIST", 14, 75);
        
        let body = [];
        this.checklistItems.forEach(q => {
            const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
            const status = selected ? selected.value : 'N/A';
            body.push([q.category, q.text, status]);
        });

        doc.autoTable({
            startY: 80, head: [['Category', 'Verification Item', 'Status']], body: body, headStyles: { fillColor: [0, 52, 120] },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 2) {
                    if(data.cell.raw === 'PASS') data.cell.styles.textColor = [0, 128, 0];
                    if(data.cell.raw === 'FAIL') data.cell.styles.textColor = [255, 0, 0];
                    if(data.cell.raw === 'MONITOR') data.cell.styles.textColor = [200, 150, 0];
                }
            }
        });

        let finalY = doc.lastAutoTable.finalY + 15;

        // Comentários
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("COMMENTS & FINDINGS", 14, finalY);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(document.getElementById('f-obs').value || 'No comments.', 180);
        doc.text(splitText, 14, finalY + 7);

        // Imprime as fotos
        if (this.tempPhotos && this.tempPhotos.length > 0) {
            doc.addPage();
            doc.setFillColor(0, 52, 120); doc.rect(0, 0, 210, 20, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
            doc.text("EVIDENCE PHOTOS", 105, 13, {align:"center"});
            
            let y = 30; let xPos = 15;
            for (let i = 0; i < this.tempPhotos.length; i++) {
                if(y + 45 > 280) { doc.addPage(); y = 30; xPos = 15; }
                await this.drawSmartLogo(doc, this.tempPhotos[i], xPos, y, 55, 45);
                xPos += 60; 
                if(xPos > 180) { xPos = 15; y += 50; }
            }
        }

        // Compartilhar
        const filename = `VEV_Report_${vin}.pdf`;
        if (navigator.share && navigator.canShare) {
            try {
                const blob = doc.output('blob');
                const file = new File([blob], filename, { type: "application/pdf" });
                await navigator.share({ files: [file], title: filename, text: `VEV Evaluation for ${vin}` });
            } catch (e) { doc.save(filename); }
        } else { doc.save(filename); }
    },

    // --- UTILITÁRIOS DE IMAGEM ---
    closeModal() { document.getElementById('modal').style.display = 'none'; },
    fmtDate(d) { if(!d) return '-'; return new Date(d+'T12:00:00').toLocaleDateString('en-US'); },
    resizeImage(file, w, h, cb) { const r = new FileReader(); r.readAsDataURL(file); r.onload = (e) => { const i = new Image(); i.src = e.target.result; i.onload = () => { const c = document.createElement('canvas'); let wt = i.width; let ht = i.height; if (wt > ht) { if (wt > w) { ht *= w / wt; wt = w; } } else { if (ht > h) { wt *= h / ht; ht = h; } } c.width = wt; c.height = ht; c.getContext('2d').drawImage(i, 0, 0, wt, ht); cb(c.toDataURL('image/jpeg', 0.8)); }; }; },
    handleImagePreview(e) { Array.from(e.target.files).forEach(f => this.resizeImage(f, 1200, 1200, b => { this.tempPhotos.push(b); this.renderImagePreviews(); })); },
    renderImagePreviews() { const c = document.getElementById('image-preview-container'); c.innerHTML = ''; this.tempPhotos.forEach((s, i) => { const d = document.createElement('div'); d.className='photo-wrapper'; d.style="position:relative;"; d.innerHTML = `<img src="${s}" style="height:80px; border-radius:4px; cursor:pointer;" onclick="window.open('${s}')"><div style="position:absolute; top:-5px; right:-5px; background:red; color:white; width:20px; height:20px; border-radius:50%; text-align:center; cursor:pointer;" onclick="app.removePhoto(${i})">&times;</div>`; c.appendChild(d); }); },
    removePhoto(i) { this.tempPhotos.splice(i, 1); this.renderImagePreviews(); },
    async drawSmartLogo(doc, b64, x, y, maxW, maxH) { return new Promise(r => { const i = new Image(); i.src = b64; i.onload = () => { const ratio = i.width / i.height; let fw = maxW; let fh = fw / ratio; if(fh > maxH) { fh = maxH; fw = fh * ratio; } let fx = x === 'center' ? (210 - fw) / 2 : x + (maxW - fw) / 2; try { doc.addImage(b64, 'JPEG', fx, y + (maxH - fh) / 2, fw, fh); } catch(e){} r(); }; i.onerror = r; }); }
};

window.onload = () => app.initApp();
