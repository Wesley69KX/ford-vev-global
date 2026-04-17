async melhorarTextoComIA(botao) {
        const textarea = document.getElementById('i-obs');
        const textoOriginal = textarea.value;

        if (!textoOriginal || textoOriginal.trim().length < 5) {
            return alert("Escreva um pouco mais sobre o problema antes de chamar a IA.");
        }

        const conteudoOriginalBotao = botao.innerHTML;
        botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">hourglass_empty</span> GERANDO...';
        botao.style.background = "#f1f5f9";
        botao.style.color = "#64748b";
        botao.disabled = true;

        // A CHAVE CORRETA QUE VOCÊ GEROU
        const API_KEY = "AQ.Ab8RN6K6PazIXWnfa4aiHNrTlHlMnldkQ3ycNn__Lwzi_AciOA"; // Usei a exata do seu print!

        const promptComando = "Atue como Engenheiro Automotivo. Reescreva este texto em linguagem técnica para laudo de avaria, sendo direto, sem aspas ou introduções. O texto é: " + textoOriginal;

        try {
            // URL usando a versão mais recente e enviando a chave de forma nativa e mais estável
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
            
            const resposta = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "contents": [{ "parts": [{ "text": promptComando }] }]
                })
            });

            if (!resposta.ok) {
                const erroStatus = resposta.status;
                const erroMsg = await resposta.text();
                alert(`Erro do Google (Código ${erroStatus}). Me avise qual número apareceu!`);
                console.error("ERRO DO GOOGLE:", erroMsg);
                throw new Error("Falha na API");
            }

            const dados = await resposta.json();
            
            if (dados.candidates && dados.candidates[0].content.parts[0].text) {
                textarea.value = dados.candidates[0].content.parts[0].text.trim();
                
                botao.innerHTML = '<span class="material-icons" style="font-size: 1rem;">check</span> PRONTO!';
                botao.style.background = "#dcfce7";
                botao.style.color = "#16a34a";
            } else {
                alert("O texto foi enviado, mas a resposta da IA veio vazia.");
            }
        } catch (error) {
            alert("A conexão falhou. Se a chave for nova, pode demorar alguns minutos para o Google ativá-la.");
        } finally {
            setTimeout(() => {
                botao.innerHTML = conteudoOriginalBotao;
                botao.style.background = "#ede9fe";
                botao.style.color = "#8b5cf6";
                botao.disabled = false;
            }, 3000);
        }
    }
