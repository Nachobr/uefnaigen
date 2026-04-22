using { /Fortnite.com/Devices }
using { /Verse.org/Simulation }

housing_manager := class(creative_device):

    @editable
    WelcomeSquareItemGranter : item_granter_device = item_granter_device{}

    OnBegin<override, suspends>():void =
        if (Player := player[Agent]):
        Player.SetHousingManager(this)
        WelcomeSquareItemGranter = item_granter_device{}

    HandleItemGrant(Agent:agent):void =
        if (Player := player[Agent]):
        if (WelcomeSquareItemGranter != null):
        WelcomeSquareItemGranter.GrantItems(Player)
