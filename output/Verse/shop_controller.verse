using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

shop_controller := class(creative_device):

    @editable
    NPCShopDistrictTeleportPad : teleporter_device = teleporter_device{}
    @editable
    NPCShopWelcomeMessage : hud_message_device = hud_message_device{}

    OnBegin<override, suspends>():void =
        if (TeleportPad := NPCShopDistrictTeleportPad) { TeleportPad.Activate() }
        if (WelcomeMessage := NPCShopWelcomeMessage) { WelcomeMessage.Show() }

    HandlePurchase(Agent:agent):void =
        if (Player := Agent.GetPlayer()) { Player.SpendCurrency(silver_currency, 10) }
        if (TransactionSuccess := ProcessPurchase(Agent)) { TransactionSuccess.ShowConfirmation() } else { ShowFailureMessage(Agent) }
