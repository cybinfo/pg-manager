"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Plus, Trash2, Home, Bed } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { ConfigurableRoomType, OwnerConfig } from "@/types/settings.types"

interface RoomTypeSettingsProps {
  configurableRoomTypes: ConfigurableRoomType[]
  setConfigurableRoomTypes: (types: ConfigurableRoomType[]) => void
  config: OwnerConfig | null
  setConfig: (config: OwnerConfig) => void
}

export function RoomTypeSettings({
  configurableRoomTypes,
  setConfigurableRoomTypes,
  config,
  setConfig,
}: RoomTypeSettingsProps) {
  const { saving, save } = useSettingsMutation({ configId: config?.id, setConfig })
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [showAddRoomType, setShowAddRoomType] = useState(false)
  const [newRoomType, setNewRoomType] = useState({ name: "", code: "", default_rent: 5000, default_deposit: 5000 })

  const addRoomType = () => {
    if (!newRoomType.name || !newRoomType.code) {
      showError("Please enter name and code")
      return
    }
    if (configurableRoomTypes.some(rt => rt.code === newRoomType.code.toLowerCase())) {
      showError("A room type with this code already exists")
      return
    }
    const newType: ConfigurableRoomType = {
      code: newRoomType.code.toLowerCase().replace(/\s+/g, '_'),
      name: newRoomType.name,
      default_rent: newRoomType.default_rent,
      default_deposit: newRoomType.default_deposit,
      is_enabled: true,
      display_order: configurableRoomTypes.length + 1,
    }
    setConfigurableRoomTypes([...configurableRoomTypes, newType])
    setNewRoomType({ name: "", code: "", default_rent: 5000, default_deposit: 5000 })
    setShowAddRoomType(false)
  }

  const deleteRoomType = (code: string) => {
    confirm({
      title: "Delete Room Type",
      description: "Delete this room type? Make sure no rooms are using it.",
      destructive: true,
      onConfirm: () => setConfigurableRoomTypes(configurableRoomTypes.filter(rt => rt.code !== code)),
    })
  }

  const toggleRoomType = (code: string) => {
    setConfigurableRoomTypes(configurableRoomTypes.map(rt =>
      rt.code === code ? { ...rt, is_enabled: !rt.is_enabled } : rt
    ))
  }

  const updateRoomTypePricing = (code: string, field: 'default_rent' | 'default_deposit', value: number) => {
    setConfigurableRoomTypes(configurableRoomTypes.map(rt =>
      rt.code === code ? { ...rt, [field]: value } : rt
    ))
  }

  const saveConfigurableRoomTypes = async () => {
    await save(
      { room_types: configurableRoomTypes },
      { successMessage: "Room types saved", errorMessage: "Failed to save room types" }
    )
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Room Types
              </CardTitle>
              <CardDescription>
                Configure room types available in your properties with default pricing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddRoomType(!showAddRoomType)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Room Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Room Type Form */}
          {showAddRoomType && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-medium">Add Custom Room Type</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Name" htmlFor="roomtype_name">
                  <Input
                    id="roomtype_name"
                    placeholder="e.g., AC Single"
                    value={newRoomType.name}
                    onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
                  />
                </FormField>
                <FormField label="Code" htmlFor="roomtype_code">
                  <Input
                    id="roomtype_code"
                    placeholder="e.g., ac_single"
                    value={newRoomType.code}
                    onChange={(e) => setNewRoomType({ ...newRoomType, code: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Default Rent" htmlFor="roomtype_rent">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="roomtype_rent"
                      type="number"
                      min="0"
                      step="500"
                      className="pl-8"
                      value={newRoomType.default_rent}
                      onChange={(e) => setNewRoomType({ ...newRoomType, default_rent: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </FormField>
                <FormField label="Default Deposit" htmlFor="roomtype_deposit">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      id="roomtype_deposit"
                      type="number"
                      min="0"
                      step="500"
                      className="pl-8"
                      value={newRoomType.default_deposit}
                      onChange={(e) => setNewRoomType({ ...newRoomType, default_deposit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addRoomType}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddRoomType(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Room Types List */}
          <div className="space-y-3">
            {configurableRoomTypes.map((roomType) => (
              <div
                key={roomType.code}
                className={`p-4 border rounded-lg transition-colors ${
                  roomType.is_enabled ? "bg-background" : "bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${roomType.is_enabled ? "bg-primary/10" : "bg-muted"}`}>
                      <Home className={`h-4 w-4 ${roomType.is_enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${!roomType.is_enabled && "text-muted-foreground"}`}>
                        {roomType.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{roomType.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRoomType(roomType.code)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        roomType.is_enabled ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          roomType.is_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRoomType(roomType.code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Default Rent</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="500"
                        className="pl-8 h-9"
                        value={roomType.default_rent}
                        onChange={(e) => updateRoomTypePricing(roomType.code, 'default_rent', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Deposit</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="500"
                        className="pl-8 h-9"
                        value={roomType.default_deposit}
                        onChange={(e) => updateRoomTypePricing(roomType.code, 'default_deposit', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={saveConfigurableRoomTypes} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Room Types
          </Button>

          <p className="text-xs text-muted-foreground">
            These room types will appear in the dropdown when creating rooms.
            Default pricing is used when a room type is selected.
          </p>
        </CardContent>
      </Card>
      {ConfirmDialogElement}
    </div>
  )
}
