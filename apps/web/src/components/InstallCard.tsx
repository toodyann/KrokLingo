import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useInstall } from '../lib/install'

/** Installing KrokLingo as an app: a button where the browser offers it, instructions elsewhere. */
export function InstallCard() {
  const { state, install } = useInstall()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Застосунок</CardTitle>
        <CardDescription>
          Встановлений KrokLingo відкривається з головного екрана в окремому вікні й працює без інтернету.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {state === 'installed' && <Badge variant="success">Встановлено</Badge>}
        {state === 'available' && <Button onClick={() => void install()}>Встановити</Button>}
        {state === 'ios' && (
          <p>
            У Safari натисніть «Поділитися», потім «На початковий екран».
          </p>
        )}
        {state === 'unsupported' && (
          <p>Відкрийте меню браузера й виберіть «Встановити застосунок» або «Додати на головний екран».</p>
        )}
      </CardContent>
    </Card>
  )
}
