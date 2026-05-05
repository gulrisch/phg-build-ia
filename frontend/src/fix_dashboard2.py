content = open('Dashboard.jsx', encoding='utf-8').read()

# Retirer budget de la section Gestion
content = content.replace(
    '{ id: "budget", icon: "💰", label: "Budget IA" },\n    { id: "subscriptions"',
    '{ id: "subscriptions"'
)

# Ajouter budget dans MES DONNÉES (après projects)
content = content.replace(
    '{ id: "projects", icon: "O", label: "Projets" },',
    '{ id: "projects", icon: "O", label: "Projets" },\n    { id: "budget", icon: "💰", label: "Budget IA" },'
)

open('Dashboard.jsx', 'w', encoding='utf-8').write(content)
print('OK')