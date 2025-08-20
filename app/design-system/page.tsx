import { Button, Card, CardHeader, CardContent, CardFooter, Badge, Input } from '@/components/ui'

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-bg text-text p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Stjarna MVP Design System</h1>
          <p className="text-text-muted text-lg">
            Design tokens and components for the restaurant widget platform
          </p>
        </div>

        {/* Colors */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Colors</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 bg-bg border border-border rounded-card"></div>
                <p className="text-sm font-medium">Background</p>
                <p className="text-xs text-text-muted">#0B0D12</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-surface border border-border rounded-card"></div>
                <p className="text-sm font-medium">Surface</p>
                <p className="text-xs text-text-muted">#0F131A</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-surface-2 border border-border rounded-card"></div>
                <p className="text-sm font-medium">Surface 2</p>
                <p className="text-xs text-text-muted">#141A23</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 bg-accent border border-border rounded-card"></div>
                <p className="text-sm font-medium">Accent (Mint)</p>
                <p className="text-xs text-text-muted">#2EE6A6</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Typography</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">Heading 1 (3xl)</h1>
              <p className="text-text-muted">32px, line-height 1.2</p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Heading 2 (2xl)</h2>
              <p className="text-text-muted">24px, line-height 1.2</p>
            </div>
            <div>
              <h3 className="text-xl font-medium">Heading 3 (xl)</h3>
              <p className="text-text-muted">20px, line-height 1.2</p>
            </div>
            <div>
              <p className="text-base">Body text (base)</p>
              <p className="text-text-muted">16px, line-height 1.4</p>
            </div>
            <div>
              <p className="text-sm">Small text (sm)</p>
              <p className="text-text-muted">14px, line-height 1.4</p>
            </div>
            <div>
              <p className="text-xs">Extra small (xs)</p>
              <p className="text-text-muted">12px, line-height 1.4</p>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Buttons</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Variants</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Sizes</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">States</h3>
                <div className="flex flex-wrap gap-4">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Badges</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Inputs</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Email Address"
                  placeholder="Enter your email"
                  type="email"
                />
                <Input 
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="With Helper Text"
                  placeholder="This input has helper text"
                  helperText="This is some helpful text below the input"
                />
                <Input 
                  label="With Error"
                  placeholder="This input has an error"
                  error="This field is required"
                />
              </div>
              
              <div>
                <Input 
                  label="Disabled Input"
                  placeholder="This input is disabled"
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spacing */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Spacing Scale</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48].map((space) => (
                <div key={space} className="flex items-center gap-4">
                  <div 
                    className="bg-accent rounded"
                    style={{ width: `${space}px`, height: `${space}px` }}
                  ></div>
                  <span className="text-sm font-mono">{space}px</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Border Radius */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Border Radius</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent rounded-button"></div>
                <span className="text-sm">Button (9999px)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent rounded-input"></div>
                <span className="text-sm">Input (12px)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent rounded-card"></div>
                <span className="text-sm">Card (16px)</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent rounded-modal"></div>
                <span className="text-sm">Modal (20px)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shadows */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold">Shadows</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-surface rounded-card shadow-card">
                <p className="text-sm font-medium">Card Shadow</p>
                <p className="text-xs text-text-muted">0 6px 24px rgba(0,0,0,.25)</p>
              </div>
              <div className="p-6 bg-surface rounded-modal shadow-modal">
                <p className="text-sm font-medium">Modal Shadow</p>
                <p className="text-xs text-text-muted">0 12px 32px rgba(0,0,0,.35)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
