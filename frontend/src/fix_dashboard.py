content = open('Dashboard.jsx', encoding='utf-8').read()
old = '{ id: "subscriptions", icon: "◆", label: "Abonnements" },'
new = '{ id: "budget", icon: "💰", label: "Budget IA" },\n    { id: "subscriptions", icon: "◆", label: "Abonnements" },'
result = content.replace(old, new)
open('Dashboard.jsx', 'w', encoding='utf-8').write(result)
print('OK - Budget IA ajouté')