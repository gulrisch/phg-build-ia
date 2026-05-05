content = open('App.jsx', encoding='utf-8').read()
content = content.replace(
    '{ id: "assistant",     icon: "🤖", label: "Assistant IA",             lock: !CAN.pdf(plan) },',
    '{ id: "assistant",     icon: "🤖", label: "Assistant IA",             lock: !CAN.pdf(plan) },\n    { id: "budget",        icon: "💰", label: "Budget IA" },'
)
open('App.jsx', 'w', encoding='utf-8').write(content)
print('OK')
