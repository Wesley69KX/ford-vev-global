// ===============================================================
// ⚠️ COLE A SUA LOGO EM BASE64 DENTRO DAS ASPAS ABAIXO ⚠️
const LOGO_BASE64 = "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"; 
// ===============================================================

const app = {
    evaluations: [], sectors: [], tempPhotos: [],
    db: null, dbLocal: null,
    currentLocation: "", collectionName: "",
    adminUser: "vev", adminPass: "ford123", // SENHA DE ACESSO

    // SUAS CHAVES DO FIREBASE (Já configuradas)
    firebaseConfig: {
        apiKey: "AIzaSyCY5aZ2WzeY8miMomN3OgR6al4psXGnE3A",
        authDomain: "ford-vev.firebaseapp.com",
        projectId: "ford-vev",
        storageBucket: "ford-vev.firebasestorage.app",
        messagingSenderId: "391022165832",
        appId: "1:391022165832:web:cfa6c741c946a030b37d7d",
        measurementId: "G-EDFWJB8XE3"
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
        } else { alert("Credenciais Inválidas"); }
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
        } catch (e) { alert("Erro ao salvar programa."); }
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

    // --- SALVAR AVALIAÇÃO ---
    async saveEvaluation(e) {
        e.preventDefault();
        const btnSave = document.getElementById('btn-save-veh');
        if(btnSave) { btnSave.disabled = true; btnSave.innerText = "Saving..."; }

        try {
            let id = document.getElementById('veh-id').value || Date.now();
            
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
                photos: [...this.tempPhotos],
                evaluator: document.getElementById('login-user').value
            };

            await this.db.collection(this.collectionName).doc(String(id)).set(evData);
            this.closeModal();
            alert("Avaliação salva com sucesso!");
        } catch(err) {
            alert("Erro: " + err.message);
        } finally {
            if(btnSave) { btnSave.disabled = false; btnSave.innerText = "Save Eval"; }
        }
    },

    // --- PDF COM A LOGO NO CABEÇALHO ---
    async generateEvaluationPDF() {
        const vin = document.getElementById('f-placa').value.toUpperCase();
        if(!vin) return alert("Please fill at least the VIN.");

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Fundo Azul do Cabeçalho
        doc.setFillColor(0, 52, 120); 
        doc.rect(0, 0, 210, 30, 'F');

        // COLOCA A LOGO SE ELA EXISTIR
        if (LOGO_BASE64 && LOGO_BASE64.length > 50) {
            try {
                // Tenta calcular proporção pra não distorcer (max largura 40, max altura 20)
                doc.addImage(LOGO_BASE64, 'PNG', 10, 5, 40, 20, '', 'FAST'); 
            } catch (e) {
                console.log("Erro ao processar a imagem da logo", e);
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("VEV GLOBAL - OFFICIAL REPORT", 200, 18, {align:"right"});
        
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
