
## Melhorias a implementar

### 1. 🔍 Busca de produtos no cardápio
- Campo de pesquisa fixo abaixo da barra de categorias
- Filtra produtos pelo nome em tempo real
- Ícone de lupa e botão para limpar

### 2. ⏱️ Tempo estimado de entrega
- Nova configuração no painel admin (ex: "30-50 min")
- Exibido na página de confirmação do pedido
- Salvo na tabela `store_settings`

### 3. 🔔 Notificação sonora no painel admin
- Som de alerta quando um novo pedido chega via Realtime
- Botão para ativar/desativar o som
- Usa a Web Audio API

### 4. ⭐ Favoritos
- Botão de coração nos cards de produto
- Salvo no localStorage do navegador
- Seção "Favoritos" no topo do cardápio (quando houver)

### 5. 🕐 Horário de funcionamento no cabeçalho
- Badge "Aberto" ou "Fechado" visível no cabeçalho do cardápio
- Usa o status existente da store_settings (store_open)
