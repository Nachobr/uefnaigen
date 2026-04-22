using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

hud_controller := class(creative_device):

    @editable
    NPCShopDistrictWelcomeMessage : hud_message_device = hud_message_device{}

    OnBegin<override, suspends>():void =
        if (HUD := hud[Agent]):
            HUD.AddMessage(NPCShopDistrictWelcomeMessage);
        else:
            Log("Failed to initialize HUD.");

    HandleMessageDisplay(Agent:agent):void =
        if (Player := player[Agent]):
            if (Message := NPCShopDistrictWelcomeMessage):
                Player.DisplayMessage(Message);
