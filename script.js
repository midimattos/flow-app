// Banco de dados local
let transactions = JSON.parse(localStorage.getItem('flow_data_v2')) || [];
let myChart = null;

// Definição de Categorias
const categoriesMap = {
    income: ['Salário', 'Freelance', 'Investimentos', 'Venda', 'Extras'],
    expense: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros']
};

// Alternar categorias baseado no tipo (Entrada/Saída)
function toggleCategories() {
    const type = document.getElementById('type').value;
    const catSelect = document.getElementById('category');
    catSelect.innerHTML = categoriesMap[type]
        .map(cat => `<option value="${cat}">${cat}</option>`)
        .join('');
}

// Atualizar Interface Geral
function updateUI() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;

    let filtered = transactions;
    if (start && end) {
        filtered = transactions.filter(t => 
            dayjs(t.date).isAfter(dayjs(start).subtract(1, 'day')) && 
            dayjs(t.date).isBefore(dayjs(end).add(1, 'day'))
        );
    }

    const inc = filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

    document.getElementById('total-balance').innerText = `R$ ${(inc - exp).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-income').innerText = `R$ ${inc.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('total-expense').innerText = `R$ ${exp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    renderList(filtered);
    renderChart(filtered);
    localStorage.setItem('flow_data_v2', JSON.stringify(transactions));
}

// Renderizar lista de transações
function renderList(list) {
    const container = document.getElementById('transaction-list');
    container.innerHTML = list.length ? '' : `
        <div class="text-center py-10 opacity-40">
            <i data-lucide="database" class="w-10 h-10 mx-auto mb-2"></i>
            <p class="text-sm">Nenhum registro encontrado</p>
        </div>`;

    list.slice().reverse().forEach(t => {
        const item = document.createElement('div');
        item.className = 'bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm animate-slide-up';
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}">
                    <i data-lucide="${t.type === 'income' ? 'arrow-up-right' : 'arrow-down-left'}" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <p class="font-bold text-[14px] text-slate-800">${t.desc}</p>
                        ${t.is_recurring ? '<i data-lucide="refresh-cw" class="w-3 h-3 text-blue-500 animate-spin-slow"></i>' : ''}
                    </div>
                    <p class="text-[10px] text-slate-400 uppercase font-medium tracking-tight">${dayjs(t.date).format('DD MMM YYYY')} • ${t.category}</p>
                </div>
            </div>
            <p class="font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-slate-700'}">
                ${t.type === 'income' ? '+' : '-'} ${t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </p>
        `;
        container.appendChild(item);
    });
    lucide.createIcons();
}

// Renderizar Gráfico Donut
function renderChart(list) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expensesOnly = list.filter(t => t.type === 'expense');
    
    const cats = [...new Set(expensesOnly.map(t => t.category))];
    const totals = cats.map(c => expensesOnly.filter(t => t.category === c).reduce((a, b) => a + b.amount, 0));

    if (myChart) myChart.destroy();
    
    if(expensesOnly.length === 0) return;

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: cats,
            datasets: [{
                data: totals,
                backgroundColor: ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 11, weight: 'bold' } } }
            }
        }
    });
}

// Salvar Nova Transação
document.getElementById('transaction-form').onsubmit = (e) => {
    e.preventDefault();
    
    const data = {
        id: Date.now(),
        desc: document.getElementById('desc').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        is_recurring: document.getElementById('is_recurring').checked,
        date: new Date().toISOString()
    };

    transactions.push(data);
    closeModal();
    updateUI();
    e.target.reset();
    toggleCategories();
};

// Modais e Utilitários
function openModal() { 
    document.getElementById('modal').classList.replace('hidden', 'flex'); 
}
function closeModal() { 
    document.getElementById('modal').classList.replace('flex', 'hidden'); 
}

// Exportação para PDF Profissional
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("Relatório Financeiro Flow", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${dayjs().format('MMMM YYYY')} | Gerado em: ${dayjs().format('DD/MM/YY HH:mm')}`, 14, 28);

    const body = transactions.map(t => [
        dayjs(t.date).format('DD/MM/YY'),
        t.desc,
        t.category,
        t.type === 'income' ? 'Entrada' : 'Saída',
        `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: body,
        headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 35 }
    });

    doc.save(`Flow_Relatorio_${dayjs().format('DD_MM_YY')}.pdf`);
}

// Inicialização
toggleCategories();
updateUI();

// Service Worker (Opcional para PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW fail', err));
    });
}