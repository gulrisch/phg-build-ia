content = open('Dashboard.jsx', encoding='utf-8').read()
content = content.replace(
    'import { useState, useEffect, useCallback } from "react";',
    'import { useState, useEffect, useCallback } from "react";\nimport BudgetIA from "./BudgetIA";'
)
content = content.replace(
    'case "subscriptions": return <SubscriptionsPage />;',
    'case "subscriptions": return <SubscriptionsPage />;\n      case "budget": return <BudgetIA plan={null} setPage={navigate} lang="fr" />;'
)
open('Dashboard.jsx', 'w', encoding='utf-8').write(content)
print('OK')
