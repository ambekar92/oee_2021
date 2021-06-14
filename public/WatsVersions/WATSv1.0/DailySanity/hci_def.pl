#	© 2019 NXP Confidential. All rights reserved
# 10-Dec-2012 : Updated to read Firmware version of board
# 11- Feb-2012: Added FM_Command, FM_vendor specific events
#*********************HCI Commands**********************************************
%manufacturer = (
                  "000A" => "Cambridge Silicon Radio",
                  "0048" => "Marvell Technology Group Ltd.",
                  "000F" => "Broadcom Corporation."
);

%chip_id = (
          "00" => "eagle",
          "01" => "condor / condor2",
	      "02" => "eaglelite",
		  "03" => "fly / IBIS2 / IBIS",
		  "04" => "kite",
		  "05" => "magpie", 
		  "06" => "kite / kiteGM / onaga",
          "07" => "kite2",
          "08" => "magpie2",
          "09" => "flyH",
		  "0A" => "condor2",
		  "0B" => "jay_Q0_Q1",
		  "0C" => "sfly",
		  "0D" => "scondor",
		  "0E" => "Eurus",
		  "0F" => "Sfly2",
          "10" => "bluejay_sony",
          "11" => "bluejay",				  
          "12" => "Kite3",
		  "13" => "Sfly3",       
		  "14" => "Sflyu",        
		  "15" => "BlueBee_R0_A0",
		  "16" => "SJay_A0_A1_B0",
		  "17" => "Sflyv",    
		  "18" => "Sc1 / Jay2e_R0",
		  "19" => "Jay2u",
		  "1B" => "jay_sony",
		  "1E" => "EurusBT",
		  "1F" => "EurusBT_GM",
		  "20" => "uJayu",
		  "21" => "uJayu_5G",
		  "22" => "Robin_A1",
		  "24" => "uBBee",
		  "26" => "uJaye",
		  "2F" => "EBTLite",
		  "30" => "RedStart_T0",
		  "32" => "Golden_Eagle",
		  "34" => "Everest",
		  "36" => "SC2",
		  "38" => "Starling_B0",
		  "39" => "Jay2u_B0_B1_GM",
		  "40" => "KF_A",
		  "42" => "CAC",
		  "33" => "Robin2",
		  "46" => "SC3",
		  "48" => "Falcon"
);

%hci_ver = (
                  "00" => "Bluetooth Core Specification 1.0b",
                  "01" => "Bluetooth Core Specification 1.1",
                  "02" => "Bluetooth Core Specification 1.2",
                  "03" => "Bluetooth Core Specification 2.0 + EDR",
                  "04" => "Bluetooth Core Specification 2.1 + EDR",
                  "05" => "Bluetooth Core Specification 3.0 + HS",
                  "06" => "Bluetooth Core Specification 4.0"
);


%hci_cmd = (

# NFC commands

"SNFC_HCI_CMD_OPEN_PIPE" => [["3F", "0281",
"COMMAND_ID:1:03",
"PIPE_ID:1:01"],[
"Status:1",
"return_value:*",
]],

"SNFC_HCI_CMD_CLOSE_PIPE" => [["3F", "0281",
"command_ID:1:04",
"PIPE_ID:1:01"],[
"Status:1",
"return_value:*",
]],

"SNFC_HCI_CMD_CLEAR_ALL_PIPE" => [["3F", "0281",
"command_ID:1:14",
"PIPE_ID:1:01",
"REF DATA:2:FF FF"],[
"Status:1",
"return_value:*",
]],

"SNFC_HCI_CMD_ANY_SET_PARAMETER" => [["3F", "0281",
"command_ID:1:01",
"PIPE_ID:1:01",
"Data:*",],[
"Status:1",
"return_value:*",
]],

"SNFC_HCI_CMD_ANY_GET_PARAMETER" => [["3F", "0281",
"command_ID:1:02",
"PIPE_ID:1:01",
#"Identifier:1",
"Data:*",
],[
"Status:1",
"return_value:*",
]],
        
"SNFC_HCI_CMD_ADM_CREATE_PIPE" 	=> [["3F", "0281",
"command_ID:1:10",
"PIPE_ID:1:01",
"Data:*",
#"SGID:1:",
#"HGID:1:",
#"DGID:1:",
],[
"Status:1",
"return_value:*",
]],

"SNFC_WR_XCHG_DATA" 	=> [["3F", "0281",
"command_ID:1:10",
"PIPE_ID:1:01",
"Data:*",
#"CTR_Timeout:1:00",
#"Data:*",
],[
"return_value:*",
]],

"SNFC_EVT_READER_REQUESTED" 	=> [["3F", "0281",
"command_ID:1:50",
"PIPE_ID:1:01",
],[
"Status:1",
"return_value:*",
]],

"SNFC_EVT_END_OPERATION" 	=> [["3F", "0281",
"command_ID:1:51",
"PIPE_ID:1:01",
],[
"Status :1"
]],

"SNFC_HCI_EVT_SEND_DATA" 	=> [["3F", "0281",
"command_ID:1:50",
"PIPE_ID:1:01",	   
"REF DATA:*",
],[
"Status :1",
"return_value:*",
]],# For dynamic length data

"SNFC_HCI_CMD_PRESENCE_CHECK" => [["3F", "0281",
"command_ID:1:22",
"PIPE_ID:1:01",
],[
"Status :1"
]],

# LE Commands
"LE_Set_Event_Mask" => [["08", "0001",
"LE_Event_Mask :8: 1F 00 00 00 00 00 00 00"],[
"Status :1"]],

"LE_Read_Buffer_Size" => [["08", "0002"],[
"Status :1",
"HC_LE_ACL_Data_Packet_Length :2",  
"HC_Total_Num_LE_ACL_Data_Packets :1"  
]],

"LE_Read_Local_Supported_Features" => [["08", "0003"],[
"Status :1",
"LE_Features :8"]],  

"LE_Set_Random_Address" => [["08", "0005",
"Random_Address :6: 11 22 33 44 55 66"],[     
"Status :1"]],

"LE_Set_Advertising_Parameters" =>[["08", "0006",
"Advertising_Interval_Min:2:",
"Advertising_Interval_Max:2:",
"Advertising_Type:1:",
"Own_Address_Type:1:",
"Direct_Address_Type:1:",
"Direct_Address:6:",
"Advertising_Channel_Map:1:",
"Advertising_Filter_Policy:1:"], [
"Status:1"    
]],

"LE_Set_Advertising_Data" => [["08", "0008",
"Advertising_Data_Length:1:",
"Advertising_Data:31:"], [
"Status:1"
]],

"LE_Set_Scan_Response_Data" => [["08", "0009",
"Scan_Response_Data_Length :1: 00",
"Scan_Response_Data :31: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"],[
"Status :1"]],


"LE_Set_Advertising_Enable" => [["08", "000A",
"Advertising_Enable:1:"], [
"Status:1"
]],

"LE_Set_Scan_Parameters" => [["08", "000B",
"LE_Scan_Type:1:",
"LE_Scan_Interval:2:",
"LE_Scan_Window:2:",
"Own_Address_Type:1:",
"Scan_Filter_Policy:1:"], [
"Status:1",
]],

"LE_Set_Scan_Enable" => [["08", "000C",
"LE_Scan_Enable:1:",
"Filter_Duplicates:1:"], [
"Status:1"    
]],

"LE_Create_Connection" => [["08", "000D",
"LE_Scan_Interval:2:",
"LE_Scan_Window:2:",
"Initiator_Filter_Policy:1:",
"Peer_Address_Type:1:",
"Peer_Address:6:",
"Own_Address_Type:1:",
"Conn_Interval_Min:2:",
"Conn_Interval_Max:2:",
"Conn_Latency:2:",
"Supervision_Timeout:2:",
"Minimum_CE_Length:2:",
"Maximum_CE_Length:2:"],[
"Status:1",
]],

"LE_Create_Connection_Cancel" => [[ "08", "000E"],
[
"Status:1",
]],

"LE_Add_Device_To_White_List" => [["08", "0011",
"Address_Type :1: 00",
"Address :6: 11 22 33 44 55 66"],[
"Status :1"
]],

"LE_Remove_Device_From_White_List" => [["08", "0012",
"Address_Type :1: 00",
"Address :6: 11 22 33 44 55 66"],[
"Status :1"
]],

"LE_Connection_Update" => [["08", "0013",
"Connection_Handle :2: 01 00",
"Conn_Interval_Min :2: 06 00",
"Conn_Interval_Max :2: 06 00",
"Conn_Latency :2: 00 00",
"Supervision_Timeout :2: 80 0C",
"Minimum_CE_Length :2: 02 00",
"Maximum_CE_Length :2: 02 00" ],[
]],

"LE_Start_Encryption" => [["08", "0019",
"Connection_Handle :2: 01 00",
"Random_Number :8: ", 
"Encrypted_Diversifier :2:",
"Long_Term_Key :16:"],[
]],

"LE_Long_Term_Key_Request_Reply" => [["08", "001A",
"Connection_Handle :2: 01 00",
"Long_Term_Key :16:"],[
"Status :1",
"Connection_Handle :2"
]],

"LE_Receiver_Test" => [["08", "001D",
"RX_Frequency :1: 00"],[
"Status :1"
]],

"LE_Transmitter_Test" => [["08", "001E",
"TX_Frequency :1: 00",
"Length_Of_Test_Data:1: 06",
"Packet_Payload:1: 00"],[
"Status :1"
]],

"LE_Test_End" => [["08", "001F"],[
"Status :1",
"Number_Of_Packets:2"
]],

"LE_Read_Number_Of_Packets" => [["3f", "85"],[
"Status :1",
"Number_Of_Packets:2"
]],

"LE_Set_Host_Channel_Classification" => [["08", "0014",
"Channel_Map:5:"],[
"Status :1"
]],

"LE_Read_Channel_Map" => [["08", "0015",
"Connection_Handle:2:"],[
"Status :1",
"Connection_Handle:2:",
"LE_CHANNEL_MAP:5:"
]],
####RSSI Commands
"Read_Raw_RSSI" => [["3F", "0074",
"Connection_Handle:2:"],[
"Status :1",
"Connection_Handle:2:",
"RSSI:1"
]],

"Write_RSSI_Threshold"=>[["3F", "00E9",
"Connection_Handle:2:",
"Lower_Limit:1:",
"Upper_Limit:1:"],[
"Status :1",
"Connection_Handle:2:"
]],

"Enable_Low_Power_RSSI_Monitoring_Mode"=>[["3F", "0075",
"Connection_Handle:2:",
"Low_Power_RSSI_Monitoring_Mode:1:"],[
"Status :1",
"Connection_Handle:2:"
]],
#########################
"LE_Read_Remote_Used_Features" => [["08", "0016",
"Connection_Handle:2:"],[
]],

"LE_Long_Term_Key_Requested_Negative_Reply" => [["08", "001B",
"Connection_Handle:2:"],[
"Status:1:",
"Connection_Handle:2:"
]],

# ********************
# Link Controller Commands
# ********************

"NOP" => [[ "00", "0000"],
[]],

"Set_AFH_Channel_Classification" => [[ "03", "003F",
"Channel_Map:10:"],[
"Status:1",
]],

"Read_AFH_Channel_Classification_Mode" => [[ "03", "0048"],[

"Status:1",
"AFH_Channel_Classification_Mode:1",
]],

"Write_AFH_Channel_Classification_Mode" => [[ "03", "0049",
"AFH_Channel_Classification_Mode:1:"],[
"Status:1",
]],

"Read_AFH_Channel_Assessment_Mode" => [[ "03", "0048"],[
"Status:1",
"AFH_Channel_Assessment_Mode:1",
]],

"Write_AFH_Channel_Assessment_Mode" => [[ "03", "0049",
"AFH_Channel_Assessment_Mode:1:"],[
"Status:1",
]],

"Read_AFH_Channel_Map" => [[ "05", "0006",
"Connection_Handle:2:"],[
"Status:1",
"Connection_Handle:2",
"AFH_mode:1",
"AFH_Channel_Map:10",
]],

"Inquiry" => [[ "01", "0001",
"LAP:3:",
"Inquiry_Length:1:",
"Num_Responses:1:"],[
]],

"Inquiry_Cancel" => [[ "01", "0002"],[
"Status:1",
]],

"Periodic_Inquiry_Mode" => [[ "01", "0003",
"Max_Period_Length:2:",
"Min_Period_Length:2:",
"LAP:3:",
"Inquiry_Length:1:",
"Num_Responses:1:"],[
"Status:1",
]],

"Exit_Periodic_Inquiry_Mode" => [[ "01", "0004"],[
"Status:1",
]],

"Create_Connection" => [[ "01", "0005",
"BD_ADDR:6:11 22 33 44 55 66",
"Packet_Type:2:cc18",
"Page_Scan_Repetition_Mode:1:01",
"Page_Scan_Mode:1:00",
"Clock_Offset:2:00 00",
"Allow_Role_Switch:1:00"],[
]],

"Disconnect" => [[ "01", "0006",
"Connection_Handle:2:",
"Reason:1:"],[
]],

"Add_SCO_Connection" => [[ "01", "0007",
"Connection_Handle:2:",
"Packet_Type:2:"],[
]],

"Create_Connection_Cancel" => [[ "01", "0008",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],



"Accept_Connection_Request" => [[ "01", "0009",
"BD_ADDR:6:",
"Role:1:"],[
]],

"Reject_Connection_Request" => [[ "01", "000A",
"BD_ADDR:6:",
"Reason:1:"],[
]],

"Link_Key_Request_Reply" => [[ "01", "000B",
"BD_ADDR:6:",
"Link_Key:16:"],[
"Status:1",
"return_BD_ADDR:6",
]],

"Link_Key_Request_Negative_Reply" => [[ "01", "000C",
"BD_ADDR:6:"],[
"Status:1",
"return_BD_ADDR:6",
]],

"PIN_Code_Request_Reply" => [[ "01", "000D",
"BD_ADDR:6:",
"PIN_Code_Length:1:",
"PIN_Code:16:"],[
"Status:1",
"return_BD_ADDR:6",
]],

"PIN_Code_Request_Negative_Reply" => [[ "01", "000E",
"BD_ADDR:6:"],[
"Status:1",
"return_BD_ADDR:6",
]],

"Change_Connection_Packet_Type" => [[ "01", "000F",
"Connection_Handle:2:",
"Packet_Type:2:"],[
]],

"Authentication_Requested" => [[ "01", "0011",
"Connection_Handle:2:"],[
]],

"Set_Connection_Encryption" => [[ "01", "0013",
"Connection_Handle:2:",
"Encryption_Enable:1:"],[
]],

"Change_Connection_Link_Key" => [[ "01", "0015",
"Connection_Handle:2:"],[
]],

"Master_Link_Key" => [[ "01", "0017",
"Key_Flag:1:"],[
]],

"Remote_Name_Request" => [[ "01", "0019",
"BD_ADDR:6:",
"Page_Scan_Repetition_Mode:1:",
"Page_Scan_Mode:1:",
"Clock_Offset:2:"],[
]],

"Remote_Name_Request_Cancel" => [[ "01", "001A",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],

"Read_Remote_Supported_Features" => [[ "01", "001B",
"Connection_Handle:2:"],[
]],

"Read_Remote_Extended_Features" => [[ "01", "001C",
"Connection_Handle:2:",
"Page_Number:1:"],[
]],

"Read_Remote_Version_Information" => [[ "01", "001D",
"Connection_Handle:2:"],[
]],


"Read_Clock_Offset" => [[ "01", "001F",
"Connection_Handle:2:"],[
]],

"Read_LMP_Handle" => [["01", "0020",
"Connection_Handle:2"],[
"Status:1",
"Connection_Handle:2",
"LMP_Handle:1",
"Reserved:4",
]],

"Setup_Synchronous_Connection" => [[ "01", "0028",
"Connection_Handle:2:",
"Transmit_Bandwidth:4:",
"Receive_Bandwidth:4:",
"Max_Latency:2:",
"Content_Format:2:",
"Retransmission_Effort:1:",
"Sync_Packet_type:2:"],[
]],

"Accept_Synchronous_Connection_Request" => [[ "01", "0029",
"BD_ADDR:6:",
"Transmit_Bandwidth:4:",
"Receive_Bandwidth:4:",
"Max_Latency:2:",
"Content_Format:2:",
"Retransmission_Effort:1:",
"Sync_Packet_type:2:"],[
]],

"Reject_Synchronous_Connection_Request" => [[ "01", "002A",
"BD_ADDR:6:",
"Reason:1:"],[
]],

"Enhanced_Setup_Synchronous_Connection" => [[ "01", "003D",
"Connection_Handle:2:",
"Transmit_Bandwidth:4:1F40",
"Receive_Bandwidth:4:1F40",
"Transmit_Coding_Format:5:",
"Receive_Coding_Format:5:",
"Transmit_Coding_Frame_Size:2:3C",
"Receive_Coding_Frame_Size:2:3C",
"Input_Bandwidth:4:1F400",
"Output_Bandwidth:4:1F400",
"Input_Coding_Format:5:0400000004",
"Output_Coding_Format:5:0400000004",
"Input_Coded_Data_Size:2:",
"Output_Coded_Data_Size:2:",
"Input_PCM_Data_Format:1:02",
"Output_PCM_Data_Format:1:02",
"Input_PCM_Sample_Payload_MSB_Position:1:00",
"Output_PCM_Sample_Payload_MSB_Position:1:00",
"Input_Data_Path:1:01",
"Output_Data_Path:1:01",
"Input_Transport_Unit_Size:1:00",
"Output_Transport_Unit_Size:1:00",
"Max_Latency:2:",
"Packet_Type:2:",
"Retransmission_Effort:1:"],[
]],


"Enhanced_Accept_Synchronous_Connection_Request" => [[ "01", "003E",
"BD_ADDR:6:",
"Transmit_Bandwidth:4:1F40",
"Receive_Bandwidth:4:1F40",
"Transmit_Coding_Format:5:",
"Receive_Coding_Format:5:",
"Transmit_Coding_Frame_Size:2:3C",
"Receive_Coding_Frame_Size:2:3C",
"Input_Bandwidth:4:1F400",
"Output_Bandwidth:4:1F400",
"Input_Coding_Format:5:0400000004",
"Output_Coding_Format:5:0400000004",
"Input_Coded_Data_Size:2:",
"Output_Coded_Data_Size:2:",
"Input_PCM_Data_Format:1:01",
"Output_PCM_Data_Format:1:01",
"Input_PCM_Sample_Payload_MSB_Position:1:00",
"Output_PCM_Sample_Payload_MSB_Position:1:00",
"Input_Data_Path:1:01",
"Output_Data_Path:1:01",
"Input_Transport_Unit_Size:1:00",
"Output_Transport_Unit_Size:1:00",
"Max_Latency:2:",
"Packet_Type:2:",
"Retransmission_Effort:1:"],[
]],

"MRVL_Host_PCM_Config" => [[ "3F", "006F",
"Action:1:",
"Operation_Mode:1:",
"SCO_Handle_1:2:",
"SCO_Handle_2:2:"],[
"Status:1",
]],


"MRVL_Host_PCM_Control_Enable" => [[ "3F", "0070",
"Action:1:"],[
"Status:1",
]],

"MRVL_WBS_Switch" => [[ "3F", "0073",
"Operation_Mode:1:"],[
"Status:1",
]],

"IO_Capability_Response" => [[ "01", "002B",
#"IO_Capability_Request_Reply" => [[ "01", "002B",
"BD_ADDR:6:",
"IO_Capability:1:",
"OOB_Data_Present:1:",
"Auth_Requirements:1:"],[
"Status:1",
"BD_ADDR:6",
]],

"User_Confirmation_Request_Reply" => [[ "01", "002C",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],

"User_Confirmation_Request_Negative_Reply" => [[ "01", "002D",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],

"User_Passkey_Request_Reply" => [[ "01", "002E",
"BD_ADDR:6:",
"PassKey:4:"],[
"Status:1",
"BD_ADDR:6",
]],

"User_Passkey_Request_Negative_Reply" => [[ "01", "002F",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],

"Remote_OOB_Data_Request_Reply" => [[ "01", "0030",
"BD_ADDR:6:",
"Hash_C:16:",
"Randomizer_R:16:"],[
"Status:1",
"BD_ADDR:6",
]],

"Remote_OOB_Data_Request_Negative_Reply" => [[ "01", "0033",
"BD_ADDR:6:"],[
"Status:1",
"BD_ADDR:6",
]],

"IO_Capability_Negative_Reply" => [[ "01", "0034",
"BD_ADDR:6:",
"Reason:1:"],[
"Status:1",
"BD_ADDR:6",
]],

"Read_Enhanced_Transmit_Power_Level" => [[ "03", "0068",
"Connection_Handle:2:",
"Type:1:"],[
"Status:1",
"Connection_Handle:2:",
"Transmit_Power_Level_GFSK:1",
"Transmit_Power_Level_DQPSK:1",
"Transmit_Power_Level_8DPSK:1",
]],


# ********************
# Link Policy Commands
# ********************

"Hold_Mode" => [[ "02", "0001",
"Connection_Handle:2:",
"Hold_Mode_Max_Interval:2:",
"Hold_Mode_Min_Interval:2:"],[
]],

"Sniff_Mode" => [[ "02", "0003",
"Connection_Handle:2:",
"Sniff_Max_Interval:2:",
"Sniff_Min_Interval:2:",
"Sniff_Attempt:2:",
"Sniff_TimeOut:2:"],[
]],

"Exit_Sniff_Mode" => [[ "02", "0004",
"Connection_Handle:2:"],[
]],

"Park_Mode" => [[ "02", "0005",
"Connection_Handle:2:",
"Beacon_Max_Interval:2:",
"Beacon_Min_Interval:2:"],[
]],

"Exit_Park_Mode" => [[ "02", "0006",
"Connection_Handle:2:"],[
]],

"QoS_Setup" => [[ "02", "0007",
"Connection_Handle:2:",
"Flags:1:",
"Service_Type:1:",
"Token_Rate:4:",
"Peak_Bandwidth:4:",
"Latency:4:",
"Delay_Variation:4:"],[
]],

"Role_Discovery" => [[ "02", "0009",
"Connection_Handle:2:"],[
"Status:1",
"Return_Connection_Handle:2",
"Current_Role:1",
]],

"Switch_Role" => [[ "02", "000B",
"BD_ADDR:6:",
"Role:1:"],[
]],

"Read_Link_Policy_Settings" => [[ "02", "000C",
"Connection_Handle:2:"],[
"Status:1",
"Connection_Handle:2",
"Link_Policy_Settings:2",
]],

"Write_Link_Policy_Settings" => [[ "02", "000D",
"Connection_Handle:2:",
"Link_Policy_Settings:2:"],[
"Status:1",
"Return_Connection_Handle:2",
]],

"Read_Default_Link_Policy_Settings" => [[ "02", "000E"],[
"Status:1",
"Link_Policy_Settings:2",
]],

"Write_Default_Link_Policy_Settings" => [[ "02", "000F",
"Link_Policy_Settings:2:"],[
"Status:1",
]],

"Flow_Specification" => [[ "02", "0010",
"Connection_Handle:2:",
"Flags:1:",
"Flow_Direction:1:",
"Service_Type:1:",
"Token_Rate:4:",
"Token_Bucket_Size:4:",
"Peak_Bandwidth:4:",
"Access_Latency:4:"],[
]],

"Sniff_Subrating" => [[ "02", "0011",
"Connection_Handle:2:",
"Max_Latency:2:",
"Min_Remote_Timeout:2:",
"Min_Local_Timeout:2:"],[
"Status:1",
"Return_Connection_Handle:2",
]],

# ********************************

# Controller and Baseband Commands

# ********************************

"Set_Event_Mask" => [[ "03", "0001",
"Event_Mask:8:"],[
"Status:1",
]],

"Reset" => [[ "03", "0003"],[
"Status:1",
]],

"Set_Event_Filter" => [["03", "0005",
"Filter_Type:^:00",
"Filter_Condition_Type:^:00",
"Condition:^:00"],
["Status:1"]],

"Flush" => [[ "03", "0008",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
]],

"Read_PIN_Type" => [[ "03", "0009"],[
"Status:1",
"PIN_Type:1",
]],

"Write_PIN_Type" => [[ "03", "000A",
"PIN_Type:1:"],[
"Status:1",
]],

"Create_New_Unit_Key" => [[ "03", "000B"],[
"Status:1",
]],

"Read_Stored_Link_Key" => [[ "03", "000D",
"BD_ADDR:6:",
"Read_All_Flag:1:"],[
"Status:1",
"Max_Num_Keys:2",
"Num_Keys_Read:2",
]],

"Write_Stored_Link_Key" => [["03", "0011",
"Num_Keys_to_Write:1:",
"BD_ADDR:6:",
"Link_Key:16:"],[
"Status:1",
"Num_Keys_Written:1"
]],

"Delete_Stored_Link_Key" => [[ "03", "0012",
"BD_ADDR:6:11 22 33 44 55 66",
"Delete_All_Flag:1:"],[
"Status:1",
"Num_Keys_Deleted:2",
]],

"Change_Local_Name" => [[ "03", "0013",
"Name:248:"],[
"Status:1",
]],

"Read_Local_Name" => [[ "03", "0014"],[
"Status:1",
"Name:248",
]],

"Read_Connection_Accept_Timeout" => [[ "03", "0015"],[
"Status:1",
"Conn_Accept_Timeout:2",
]],

"Write_Connection_Accept_Timeout" => [[ "03", "0016",
"Conn_Accept_Timeout:2:"],[
"Status:1",
]],

"Read_Page_Timeout" => [[ "03", "0017"],[
"Status:1",
"Page_Timeout:2",
]],

"Write_Page_Timeout" => [[ "03", "0018",
"Page_Timeout:2:"],[
"Status:1",
]],

"Read_Scan_Enable" => [[ "03", "0019"],[
"Status:1",
"Scan_Enable:1",
]],

"Write_Scan_Enable" => [[ "03", "001A",
"Scan_Enable:1:"],[
"Status:1",
]],

"Read_Page_Scan_Activity" => [[ "03", "001B"],[
"Status:1",
"Page_Scan_Interval:2",
"Page_Scan_Window:2",
]],

"Write_Page_Scan_Activity" => [[ "03", "001C",
"Page_Scan_Interval:2:00 10",
"Page_Scan_Window:2:12 00"],[
"Status:1",
]],

"Read_Inquiry_Scan_Activity" => [[ "03", "001D"],[
"Status:1",
"Inquiry_Scan_Interval:2",
"Inquiry_Scan_Window:2",
]],

"Write_Inquiry_Scan_Activity" => [[ "03", "001E",
"Inquiry_Scan_Interval:2:",
"Inquiry_Scan_Window:2:"],[
"Status:1",
]],

"Write_Inquiry_Mode" => [[ "03", "0045",
"Inquiry_Mode:1:"],[
"Status:1",
]],

"Read_Authentication_Enable" => [[ "03", "001F"],[
"Status:1",
"Authentication_Enable:1",
]],

"Write_Authentication_Enable" => [[ "03", "0020",
"Authentication_Enable:1:"],[
"Status:1",
]],

"Read_Encryption_Mode" => [[ "03", "0021"],[
"Status:1",
"Encryption_Mode:1",
]],

"Write_Encryption_Mode" => [[ "03", "0022",
"Encryption_Mode:1:"],[
"Status:1",
]],

"Read_Class_of_Device" => [[ "03", "0023"],[
"Status:1",
"Class_of_Device:3",
]],

"Write_Class_of_Device" => [[ "03", "0024",
"Class_of_Device:3:"],[
"Status:1",
]],

"Read_Voice_Setting" => [[ "03", "0025"],[
"Status:1",
"Voice_Channel_Setting:2",
]],

"Write_Voice_Setting" => [[ "03", "0026",
"Voice_Channel_Setting:2:"],[
"Status:1",
]],

"Read_Automatic_Flush_Timeout" => [[ "03", "0027",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
"Flush_Timeout:2",
]],

"Write_Automatic_Flush_Timeout" => [[ "03", "0028",
"Connection_Handle:2:",
"Flush_Timeout:2:"],[
"Status:1",
"return_Connection_Handle:2",
]],

"Read_Num_Broadcast_Retransmissions" => [[ "03", "0029"],[
"Status:1",
"Num_Broadcast_Retran:1",
]],

"Write_Num_Broadcast_Retransmissions" => [[ "03", "002A",
"Num_Broadcast_Retran:1:"],[
"Status:1",
]],

"Read_Hold_Mode_Activity" => [[ "03", "002B"],[
"Status:1",
"Hold_Mode_Activity:1",
]],

"Write_Hold_Mode_Activity" => [[ "03", "002C",
"Hold_Mode_Activity:1:"],[
"Status:1",
]],

"Read_Transmit_Power_Level" => [[ "03", "002D",
"Connection_Handle:2:",
"Type:1:"],[
"Status:1",
"return_Connection_Handle:2",
"Power_Level:1",
]],

"Read_SCO_Flow_Control_Enable" => [[ "03", "002E"],[
"Status:1",
"SCO_Flow_Control_Enable:1",
]],

"Read_Synchronous_Flow_Control_Enable" => [[ "03", "002E"],[
"Status:1",
"SCO_Flow_Control_Enable:1",
]],

"Write_SCO_Flow_Control_Enable" => [[ "03", "002F",
"SCO_Flow_Control_Enable:1:"],[
"Status:1",
]],

"Write_Synchronous_Flow_Control_Enable" => [[ "03", "002F",
"SCO_Flow_Control_Enable:1:"],[
"Status:1",
]],

"Set_Host_Controller_To_Host_Flow_Control" => [[ "03", "0031",
"Flow_Control_Enable:1:"],[
"Status:1",
]],

"Set_Controller_To_Host_Flow_Control" => [[ "03", "0031",
"Flow_Control_Enable:1:"],[
"Status:1",
]],

"Host_Buffer_Size" => [[ "03", "0033",
"Host_ACL_Data_Packet_Length:2:",
"Host_SCO_Data_Packet_Length:1:",
"Host_Total_Num_ACL_Data_Packets:2:",
"Host_Total_Num_SCO_Data_Packets:2:"],[
"Status:1",
]],

#****************************Enter Host_Number_Of_Completed_Packets commands************
"Host_Number_Of_Completed_Packets" => [[ "03", "0035",
"Number_Of_Handles:1:1", 
"Connection_Handle:2:",
"Host_Num_Of_Completed_Packets:2:"],
[]],

"Read_Link_Supervision_Timeout" => [[ "03", "0036",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
"Link_Supervision_Timeout:2",
]],

"Write_Link_Supervision_Timeout" => [[ "03", "0037",
"Connection_Handle:2:",
"Link_Supervision_Timeout:2:"],[
"Status:1",
"return_Connection_Handle:2",
]],

"Read_Number_Of_Supported_IAC" => [[ "03", "0038"],[
"Status:1",
"Num_Supported_IAC:1",
]],


"Read_Current_IAC_LAP" => [[ "03", "0039"],[
"Status:1",
"Num_Current_IAC:1", 
"IAC_LAP:^"
]],

"Write_Current_IAC_LAP" => [[ "03", "003A",
"Num_Current_IAC:1:", 
"IAC_LAP:^:33 8B 9E"],[
"Status:1",
]],

"Read_Page_Scan_Period_Mode" => [[ "03", "003B"],[
"Status:1",
"Page_Scan_Period_Mode:1",
]],

"Write_Page_Scan_Period_Mode" => [[ "03", "003C",
"Page_Scan_Period_Mode:1:"],[
"Status:1",
]],

"Read_Page_Scan_Mode" => [[ "03", "003D"],[
"Status:1",
"Page_Scan_Mode:1",
]],

"Write_Page_Scan_Mode" => [[ "03", "003E",
"Page_Scan_Mode:1:"],[
"Status:1",
]],

"Set_AFH_Channel_Classification" => [[ "03", "003F",
"Channel_Map:10:"],[
"Status:1",
]],

"Read_Inquiry_Scan_Type" => [[ "03", "0042"],[
"Status:1",
"Scan_Type:1",
]],

"Write_Inquiry_Scan_Type" => [[ "03", "0043",
"Scan_Type:1:"],[
"Status:1",
]],

"Write_Inquiry_Mode" => [[ "03", "0045",
"Rssi_Mode:1:"],[
"Status:1",
]],

"Read_Inquiry_Mode" => [[ "03", "0044"],[
"Status:1",
"Rssi_Mode:1",
]],

"Write_Page_Scan_Type" => [[ "03", "0047",
"Scan_Type:1:"],[
"Status:1",
]],

"Read_Page_Scan_Type" => [[ "03", "0046"],[
"Status:1",
"Scan_Type:1",
]],

"Read_AFH_Channel_Classification_Mode" => [[ "03", "0048"],[
"Status:1",
"AFH_Channel_Classification_Mode:1",
]],

"Write_AFH_Channel_Classification_Mode" => [[ "03", "0049",
"AFH_Channel_Classification_Mode:1:"],[
"Status:1",
]],

"Read_Extended_Inquiry_Response_Data" => [[ "03", "0051"],[
"Status:1",
"FEC_Required:1",
"InquiryRespData:240",
]],

"Write_Extended_Inquiry_Response_Data" => [[ "03", "0052",
"FEC_Required:1:",
"InquiryRespData:240:"],[
"Status:1",
]],

"Read_Simple_Pairing_Mode" => [[ "03", "0055"],[
"Status:1",
"Simple_Pairing_Mode:1",
]],

"Write_Simple_Pairing_Mode" => [[ "03", "0056",
"Simple_Pairing_Mode:1:"],[
"Status:1",
]],

"Read_Local_OOB_Data" => [[ "03", "0057"],[
"Status:1",
"Hash_C:16",
"Randomizer_R:16",
]],

"Send_KeyPress_Notification" => [[ "03", "0060",
"BD_ADDR:6:",
"Notification_Type:1:"],[
"Status:1",
"BD_ADDR:6",
]],


# ************************
# Informational Parameters
# ************************

"Read_Local_Version_Information" => [[ "04", "0001"],[
"Status:1",
"HCI_Version:1",
"HCI_Revision:2",
"LMP_Version:1",
"Manufacturer_Name:2",
"LMP_Subversion:2",
]],

"Read_Local_Supported_Commands" => [[ "04", "0002"],[
"Status:1",
"Supported_Commands:64",
]],

"Read_Local_Supported_Features" => [[ "04", "0003"],[
"Status:1",
"LMP_Features:8",
]],

"Read_Local_Extended_Features" => [[ "04", "0004",
"Page_Number:1:"],[
"Status:1",
"Page_Number:1",
"Max_Page_Number:1",
"LMP_Features:8",
]],

"Read_Buffer_Size" => [[ "04", "0005"],[
"Status:1",
"HC_ACL_Data_Packet_Length:2",
"HC_SCO_Data_Packet_Length:1",
"HC_Total_Num_ACL_Data_Packets:2",
"HC_Total_Num_SCO_Data_Packets:2",
]],

"Read_Country_Code" => [[ "04", "0007"],[
"Status:1",
"Country_Code:1",
]],

"Read_BD_ADDR" => [[ "04", "0009"],[
"Status:1",
"BD_ADDR:6",
]],

# *****************
# Status Parameters
# *****************

"Read_Failed_Contact_Counter" => [[ "05", "0001",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
"Failed_Contact_Counter:2",
]],

"Reset_Failed_Contact_Counter" => [[ "05", "0002",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
]],

"Get_Link_Quality" => [[ "05", "0003",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
"Link_Quality:1",
]],

"Read_RSSI" => [[ "05", "0005",
"Connection_Handle:2:"],[
"Status:1",
"return_Connection_Handle:2",
"RSSI:1",
]],

"Read_AFH_Channel_Map" => [[ "05", "0006",
"Connection_Handle:2:"],[
"Status:1",
"Connection_Handle:2",
"AFH_mode:1",
"AFH_Channel_Map:10",
]],

"Read_Clock" => [[ "05", "0007",
"Connection_Handle:2:",
"Which_Clock:1:"],[
"Status:1",
"return_Connection_Handle:2",
"Clock:4",
"Accuracy:2",
]],

# ****************
# Testing Commands
# ****************

"Read_Loopback_Mode" => [[ "06", "0001"],[
"Status:1",
"Loopback_Mode:1",
]],

"Write_Loopback_Mode" => [[ "06", "0002",
"Loopback_Mode:1:"],[
"Status:1",
]],

"Enable_Device_Under_Test_Mode" => [[ "06", "0003"],[
"Status:1",
]],

"Write_Simple_Pairing_Debug_Mode" => [[ "06", "0004",
"SSP_Debug_Mode:1:"],[
"Status:1",
]],

# Now the Jupiter Specific commands follow.

"Jupiter_HCMD" => [[ "3F", "0000",
"Payload_Descriptor:1:",
"Type:1:",
"Status:1:",
"VarID:1:",
"SeqNo:1:",
"Length:2:",
"Connection_Handle:2:",
"Tcd_Handle:2:"],[
]],

# Now the Ericsson Specific commands follow.

"Ericsson_Read_Memory" => [[ "3F", "0001",
"Memory_Address:4:"],[
"Status:1",
"Memory_Content:2",
]],

"Ericsson_Write_Memory" => [[ "3F", "0002",
"Memory_Address:4:",
"Memory_Content:2:"],[
"Status:1",
]],

"Ericsson_Read_HW_Register" => [[ "3F", "0003",
"Register_Number:2:"],[
"Status:1",
"Register_Value:1",
]],

"Ericsson_Write_HW_Register" => [[ "3F", "0004",
"Hardware_Block:1:",
"Register_Number:2:",
"Register_Value:1:"],[
"Status:1",
]],

"Ericsson_Read_I2C" => [[ "3F", "0005",
"Chip_Id:1:",
"Address:1:"],[
"Status:1",
"Data:1",
]],

"Ericsson_Write_I2C" => [[ "3F", "0006",
"Chip_Id:1:",
"Address:1:",
"Data:1:"],[
"Status:1",
]],

"Ericsson_Write_PCM_Settings" => [[ "3F", "0007",
"PCM_Settings:1:"],[
"Status:1",
]],

"Ericsson_Write_Scan_Triggering" => [[ "3F", "0008",
"Scan_Triggering:10:"],[
"Status:1",
]],

"Ericsson_Set_UART_Baud_Rate" => [[ "3F", "0009",
"Baud_Rate:1:"],[
"Status:1",
]],

"Ericsson_Write_XO_Trim" => [[ "3F", "000A",
"XO_Trim_Value:1:"],[
"Status:1",
]],

"Ericsson_Write_RSSI_Calibration" => [[ "3F", "000B",
"RSSI_Calibration_Values:1:"],[
"Status:1",
]],

"Ericsson_Write_Country_Code" => [[ "3F", "000C",
"Country_Code:1:"],[
"Status:1",
]],

"Ericsson_Write_BD_ADDR" => [[ "3F", "000D",
"BD_ADDR:6:"],[
"Status:1",
]],

"Ericsson_Write_Default_PIN" => [[ "3F", "000E",
"PIN_Code_Length:1:",
"PIN_Code:16:"],[
"Status:1",
]],

"Ericsson_Read_Revision_Information" => [[ "3F", "000F"],[
"Status:1",
"Revision_Info:101",
]],

"Ericsson_Self_Test" => [[ "3F", "0010",
"Self_Test_Bit_Mask:1:"],[
"Status:1",
]],

"Ericsson_Enter_Test_Mode" => [[ "3F", "0011",
"Connection_Handle:2:"],[
"Status:1",
]],

"Ericsson_Test_Control" => [[ "3F", "0012",
"Connection_Handle:2:",
"Test_Scenario:1:",
"Hopping_Mode:1:",
"Tx_Frequency:1:",
"Rx_Frequency:1:",
"Power_Control_Mode:1:",
"Poll_Period:1:",
"Test_Packet_Type:1:",
"Lenght_Of_Test_data:1:"],[
"Status:1",
]],

"Ericsson_AUX1" => [[ "3F", "0013",
"Connection_Handle:2:",
"AUX1_Number:1:"],[
"Status:1",
]],

"Ericsson_Lock_NVDS_User_Ids" => [[ "3F", "0014"],[
"Status:1",
]],

"Ericsson_BER" => [[ "3F", "0015",
"Connection_Handle:2:",
"RX_On_Start:1:",
"Synt_On_Start:1:",
"TX_On_Start:1:",
"Phd_Off_Start:1:",
"BER_Hopping_Mode:1:",
"TX_Channel_Master:1:",
"TX_Channel_Slave:1:",
"Whitening_Enable:1:",
"Nbr_Of_Packets:2:",
"BER_Packet_Type:1:",
"Test_Data_Type:1:",
"Test_Data:1:",
"PX_On_Start:1:",
"BER_Interval:1:"],[
"Status:1",
]],

"Ericsson_Write_LPO_Trim" => [[ "3F", "0016",
"LPO_Trim_Value:1:"],[
"Status:1",
]],

"Ericsson_Periodic_Page_Mode" => [[ "3F", "0017",
"Max_Page_Period_Mode:2:",
"Min_Page_Period_Mode:2:",
"BD_ADDR:6:",
"Packet_Type:2:",
"Page_Scan_Repetition_Mode:1:",
"Page_Scan_Mode:1:",
"Clock_Offset:2:",
"Allow_Role_Switch:1:"],[
"Status:1",
]],

"Ericsson_Exit_Periodic_Page_Mode" => [[ "3F", "0018"],[
"Status:1",
]],

"Ericsson_TX_Test" => [[ "3F", "0019",
"RX_On_Start:1:",
"Synt_On_Start:1:",
"TX_On_Start:1:",
"Phd_Off_Start:1:",
"Test_Scenario:1:",
"Hopping_Mode:1:",
"TX_Frequency:1:",
"RX_Frequency:1:",
"TX_Test_Interval:1:",
"Test_Packet_Type:1:",
"Length_Of_Test_Data:2:"],[
"Status:1",
]],

"Ericsson_Store_In_Flash" => [[ "3F", "0022",
"User_id:1:",
"Flash_Length:1:",
"Flash_Data:6:"],[
"Status:1",
]],

"Ericsson_Read_From_Flash" => [[ "3F", "002A",
"User_id:1:",
"Flash_Length:1:"],[
"Status:1",
"Flash_Data:6",
]],

# Now the Ericsson Specific commands follow.
"Sony_TBS_Enable" => [[ "3F", "0024",
"Connection_Handle:2:",
"TBS_Enable:1:"],[
"Status:1",
]],

"Sony_TBS_Configure" => [[ "3F", "001E", 
"Action:1:", 
"A2DP_Src_Persistence:8:", 
"A2DP_Src_PollPeriod:8:", 
"A2DP_Src_Active_Timeout:8:",],[ 
"Status:1", "Action:1", 
"A2DP_Src_Persistence:8:", 
"A2DP_Src_Active_Timeout:8:", 
"A2DP_Src_PollPeriod:8:", 
]],

#t_Data_field

"Ericsson_Write_Max_Power" => [[ "3F", "002B",
"Connection_Handle:2:",
"Max_Power_Level:1:"],[
"Status:1",
]],

"Ericsson_Read_Max_Power" => [[ "3F", "002C",
"Connection_Handle:2:"],[
"Status:1",
"Max_Power_Level:1",
]],

"Ericsson_Enhanced_Power_Control" => [[ "3F", "002D",
"Connection_Handle:2:",
"Algoritm_Mode:1:",
"Algoritm_Cycle_Time:2:",
"Plus_One_Step_Margin:1:"],[
"Status:1",
]],

"Ericsson_Write_File_Block" => [[ "3F", "002E",
"File_Block_Id:1:",
"File_Block:1:"],[
"Status:1",
"File_Block_Id:1",
]],

"Ericsson_Enable_Patches" => [["3F", "0030",
"Patch_Enable:1"],[
"Status:1",
]],

"Ericsson_Test_ACL_Receive" => [[ "3F", "001A",
"Connection_Handle:2:",
"Enable:1:",
"Test_Case:1:",
"L2CAP_Packet_Length:2:",
"Chunk_Size:2:",
"Packet_Type:2:"],[
"Status:1",
]],

"Ericsson_Test_ACL_Send" => [[ "3F", "001B",
"Connection_Handle:2:",
"Enable:1:",
"Test_Case:1:",
"L2CAP_Packet_Length:2:",
"Chunk_Size:2:",
"Packet_Type:2:"],[
"Status:1",
]],

"Ericsson_Set_SCO_Data_Path" => [[ "3F", "001D",
"SCO_Data_Path:1:"],[
"Status:1",
]],

"Ericsson_Send_LMP" => [[ "3F", "0021",
"Connection_Handle:2:",
"LMP_Length:1:",
"LMP_Data:17:"],[
"Status:1",
]],

"LMP_accepted" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d003 (0x03) + TID (0x06(M), 0x07(S))
#** LMP Parameters
"op_code:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_accepted_ext" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x04
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d001 (0x01)
#** LMP Parameters
"escape_op_code:1:",
"extended_op_code:1:",
"EMPTY:13:"],[
"Status:1",
]],

"LMP_au_rand" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d011 (0x0B) + TID (0x16(M), 0x17(S))
#** LMP Parameters
"random_number:16:"],[
"Status:1",
]],

"LMP_auto_rate" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d035 (0x23) + TID (0x46(M), 0x47(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_channel_classification_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x07
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d016 (0x10)
#** LMP Parameters
"AFH_reporting_mode:1:",
"AFH_min_interval:2:",
"AFH_max_interval:2:",
"EMPTY:10:"],[
"Status:1",
]],

"LMP_channel_classification" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0C
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d017 (0x11)
#** LMP Parameters
"AFH_channel_classification:10:",
"EMPTY:5:"],[
"Status:1",
]],

"LMP_clkoffset_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d005 (0x05) + TID (0x0A(M), 0x0B(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_clkoffset_res" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d006 (0x06) + TID (0x0C(M), 0x0D(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_comb_key" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d009 (0x09) + TID (0x12(M), 0x13(S))
#** LMP Parameters
"random_number:16:"],[
"Status:1",
]],

"LMP_decr_power_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d032 (0x20) + TID (0x40(M), 0x41(S))
#** LMP Parameters
"reserved:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_detach" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d007 (0x07) + TID (0x0E(M), 0x0F(S))
#** LMP Parameters
"error_code:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_encryption_key_size_mask_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d058 (0x3A) + TID (0x74(M), 0x75(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_encryption_key_size_mask_res" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d059 (0x3B) + TID (0x76(M), 0x77(S))
#** LMP Parameters
"key_size_mask:2:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_encryption_key_size_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d016 (0x10) + TID (0x20(M), 0x21(S))
#** LMP Parameters
"key_size:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_encryption_mode_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d015 (0x0F) + TID (0x1E(M), 0x1F(S))
#** LMP Parameters
"encryption_mode:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_eSCO_link_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x10
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d012 (0x0C)
#** LMP Parameters
"eSCO_handle:1:",
"eSCO_LT_ADDR:1:",
"timing_control_flags:1:",
"DeSCO:1:",
"TeSCO:1:",
"WeSCO:1:",
"SCO_packet_type_MS:1:",
"SCO_packet_type_SM:1:",
"packet_length_MS:2:",
"packet_length_SM:2:",
"air_mode:1:",
"negotiation_state:1:",
"EMPTY:1:",   # 0x0],[
"Status:1",
]],

"LMP_features_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x09
"OP:1:",   # 0d039 (0x27) + TID (0x4E(M), 0x4F(S))
#** LMP Parameters
"features:8:",
"EMPTY:8:"],[
"Status:1",
]],

"LMP_features_req_ext" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0C
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d003 (0x03)
#** LMP Parameters
"features_page:1:",
"max_supported_page:1:",
"extended_features:8:",
"EMPTY:5:"],[
"Status:1",
]],

"LMP_features_res" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x09
"OP:1:",   # 0d040 (0x28) + TID (0x50(M), 0x51(S))
#** LMP Parameters
"features:8:",
"EMPTY:8:"],[
"Status:1",
]],

"LMP_features_res_ext" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0C
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d004 (0x04)
#** LMP Parameters
"features_page:1:",
"max_supported_page:1:",
"extended_features:8:",
"EMPTY:5:"],[
"Status:1",
]],

"LMP_host_connection_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d051 (0x33) + TID (0x66(M), 0x67(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_hold" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x07
"OP:1:",   # 0d020 (0x14) + TID (0x28(M), 0x29(S))
#** LMP Parameters
"hold_time:2:",
"hold_instant:4:",
"EMPTY:10:"],[
"Status:1",
]],

"LMP_hold_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x07
"OP:1:",   # 0d021 (0x15) + TID (0x2A(M), 0x2B(S))
#** LMP Parameters
"hold_time:2:",
"hold_instant:4:",
"EMPTY:10:"],[
"Status:1",
]],

"LMP_incr_power_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d031 (0x1F) + TID (0x3E(M), 0x3F(S))
#** LMP Parameters
"reserved:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_in_rand" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d008 (0x08) + TID (0x10(M), 0x11(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_max_power" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d033 (0x21) + TID (0x42(M), 0x43(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_max_slot" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d045 (0x2D) + TID (0x5A(M), 0x5B(S))
#** LMP Parameters
"max_slots:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_max_slot_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d046 (0x2E) + TID (0x5C(M), 0x5D(S))
#** LMP Parameters
"max_slots:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_min_power" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d034 (0x22) + TID (0x44(M), 0x45(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_modify_beacon" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0B
"OP:1:",   # 0d028 (0x1C) + TID (0x38(M), 0x39(S))
#** LMP Parameters
"timing_control_flags:1:",
"TB:2:",
"NB:1:",
"DeltaB:1:",
"Daccess:1:",
"Taccess:1:",
"Nacc_slots:1:",
"Npoll:1:",
"EMPTY:7:"],[
"Status:1",
]],

"LMP_name_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d001 (0x01) + TID (0x02(M), 0x03(S))
#** LMP Parameters
"name_offset:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_name_res" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d002 (0x02) + TID (0x04(M), 0x05(S))
#** LMP Parameters
"name_offset:1:",
"name_length:1:",
"name_fragment:14:"],[
"Status:1",
]],

"LMP_not_accepted" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d004 (0x04) + TID (0x08(M), 0x09(S))
#** LMP Parameters
"op_code:1:",
"error_code:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_not_accepted_ext" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x05
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d002 (0x02)
#** LMP Parameters
"escape_op_code:1:",
"extended_op_code:1:",
"error_code:1:",
"EMPTY:12:"],[
"Status:1",
]],

"LMP_packet_type_table" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d011 (0x0B)
#** LMP Parameters
"packet_type_table:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_page_mode_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d053 (0x35) + TID (0x6A(M), 0x6B(S))
#** LMP Parameters
"paging_scheme:1:",
"paging_scheme_settings:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_page_scan_mode_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d054 (0x36) + TID (0x6C(M), 0x6D(S))
#** LMP Parameters
"paging_scheme:1:",
"paging_scheme_settings:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_park_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d025 (0x19) + TID (0x32(M), 0x33(S))
#** LMP Parameters
"timing_control_flags:1:",
"DB:2:",
"TB:2:",
"NB:1:",
"DeltaB:1:",
"PM_ADDR:1:",
"AR_ADDR:1:",
"NBsleep:1:",
"DBsleep:1:",
"Daccess:1:",
"Taccess:1:",
"Nacc_slots:1:",
"Npoll:1:",
"Access:1:"],[
"Status:1",
]],

"LMP_preferred_rate" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x02
"OP:1:",   # 0d036 (0x24) + TID (0x48(M), 0x49(S))
#** LMP Parameters
"data_rate:1:",
"EMPTY:15:"],[
"Status:1",
]],

"LMP_quality_of_service" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x04
"OP:1:",   # 0d041 (0x29) + TID (0x52(M), 0x53(S))
#** LMP Parameters
"poll_interval:2:",
"NBC:1:",
"EMPTY:13:"],[
"Status:1",
]],

"LMP_quality_of_service_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x04
"OP:1:",   # 0d042 (0x2A) + TID (0x54(M), 0x55(S))
#** LMP Parameters
"poll_interval:2:",
"NBC:1:",
"EMPTY:13:"],[
"Status:1",
]],

"LMP_remove_eSCO_link_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x04
"OP:1:",   # 0d127 (0x7F) + TID (0xFE(M), 0xFF(S))
"ExOP:1:",   # 0d013 (0x0D)
#** LMP Parameters
"eSCO_handle:1:",
"error_code:1:",
"EMPTY:13:"],[
"Status:1",
]],

"LMP_remove_SCO_link_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d044 (0x2C) + TID (0x58(M), 0x59(S))
#** LMP Parameters
"SCO_handle:1:",
"error_code:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_SCO_link_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x07
"OP:1:",   # 0d043 (0x2B) + TID (0x56(M), 0x57(S))
#** LMP Parameters
"SCO_handle:1:",
"timing_control_flags:1:",
"Dsco:1:",
"Tsco:1:",
"SCO_packet:1:",
"air_mode:1:",
"EMPTY:10:"],[
"Status:1",
]],

"LMP_set_AFH" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x10
"OP:1:",   # 0d060 (0x3C) + TID (0x78(M), 0x79(S))
#** LMP Parameters
"AFH_instant:4:",
"AFH_mode:1:",
"AFH_channel_map:10:",
"EMPTY:1:",   # 0x0],[
"Status:1",
]],

"LMP_set_broadcast_scan_window" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x04
"OP:1:",   # 0d027 (0x1B) + TID (0x36(M), 0x37(S))
#** LMP Parameters
"timing_control_flags:1:",
"broadcast_scan_window:2:",
"EMPTY:13:"],[
"Status:1",
]],

"LMP_setup_complete" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d049 (0x31) + TID (0x62(M), 0x63(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_slot_offset" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x09
"OP:1:",   # 0d052 (0x34) + TID (0x68(M), 0x69(S))
#** LMP Parameters
"slot_offset:2:",
"BD_ADDR:6:",
"EMPTY:8:"],[
"Status:1",
]],

"LMP_sniff_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0A
"OP:1:",   # 0d023 (0x17) + TID (0x2E(M), 0x2F(S))
#** LMP Parameters
"timing_control_flags:1:",
"Dsniff:2:",
"Tsniff:2:",
"sniff_attempt:2:",
"sniff_timeout:2:",
"EMPTY:7:"],[
"Status:1",
]],

"LMP_sres" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x05
"OP:1:",   # 0d012 (0x0C) + TID (0x18(M), 0x19(S))
#** LMP Parameters
"authentication_response:4:",
"EMPTY:12:"],[
"Status:1",
]],

"LMP_start_encryption_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d017 (0x11) + TID (0x22(M), 0x23(S))
#** LMP Parameters
"random_number:16:"],[
"Status:1",
]],

"LMP_stop_encryption_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d018 (0x12) + TID (0x24(M), 0x25(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_supervision_timeout" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d055 (0x37) + TID (0x6E(M), 0x6F(S))
#** LMP Parameters
"supervision_timeout:2:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_switch_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x05
"OP:1:",   # 0d019 (0x13) + TID (0x26(M), 0x27(S))
#** LMP Parameters
"switch_instant:4:",
"EMPTY:12:"],[
"Status:1",
]],

"LMP_temp_rand" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d013 (0x0D) + TID (0x1A(M), 0x1B(S))
#** LMP Parameters
"random_number:16:"],[
"Status:1",
]],

"LMP_temp_key" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d014 (0x0E) + TID (0x1C(M), 0x1D(S))
#** LMP Parameters
"key:16:"],[
"Status:1",
]],

"LMP_test_activate" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d056 (0x38) + TID (0x70(M), 0x71(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_test_control" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x0A
"OP:1:",   # 0d057 (0x39) + TID (0x72(M), 0x73(S))
#** LMP Parameters
"test_scenario:1:",
"hopping_mode:1:",
"TX_frequency:1:",
"RX_frequency:1:",
"power_control_mode:1:",
"poll_period:1:",
"packet_type:1:",
"length_of_test_data:2:",
"EMPTY:7:"],[
"Status:1",
]],

"LMP_timing_accuracy_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d047 (0x2F) + TID (0x5E(M), 0x5F(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_timing_accuracy_res" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x03
"OP:1:",   # 0d048 (0x30) + TID (0x60(M), 0x61(S))
#** LMP Parameters
"drift:1:",
"jitter:1:",
"EMPTY:14:"],[
"Status:1",
]],

"LMP_unit_key" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x11
"OP:1:",   # 0d010 (0x0A) + TID (0x14(M), 0x15(S))
#** LMP Parameters
"key:16:"],[
"Status:1",
]],

"LMP_unsniff_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d024 (0x18) + TID (0x30(M), 0x31(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_use_semi_permanent_key" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x01
"OP:1:",   # 0d050 (0x32) + TID (0x64(M), 0x65(S))
#** LMP Parameters
"EMPTY:16:"],[
"Status:1",
]],

"LMP_version_req" => [[ "3F", "0021",
"Connection_Handle:2:",
"Length:1:",   # 0x06
"OP:1:",   # 0d037 (0x25) + TID (0x4A(M), 0x4B(S))
#** LMP Parameters
"VersNr:1:",
"CompId:2:",
"SubVersNr:2:",
"EMPTY:11:"],[
"Status:1",
]],

"Ericsson_Test_SCO_Send" => [[ "3F", "0026"],[
"Status:1",
]],

"Ericsson_Write_PCM_Sync_Settings" => [[ "3F", "0028",
"PCM_Sync_Settings_1:1:",
"PCM_Sync_Settings_2:2:"],[
"Status:1",
]],

"Ericsson_Write_PCM_Link_Settings" => [[ "3F", "0029",
"PCM_Settings:2:"],[
"Status:1",
]],

"Wolfson_Codec" => [["3F", "0008",
"PCM_Role:1:00",
"PCM_Sync_Format:1:00",
"BCLK_Polarity:1:01",
"Left_Channel_Mute:1:00",
"Right_Channel_Mute:1:01",
"Audio_Format:1:00",
"Left_Channel_Input_PGA_Volume:1:0xbf",
"Right_Channel_Input_PGA_Volume:1:0xbf",
"Left_Headphone_Output_Volume:1:0x39",
"Right_Headphone_Output_Volume:1:0x3f",],[
"Status:1",
]],

# Start Command added by AFH Team

"Ericsson_Write_AFH_Parameters" => [[ "3F", "0040",
"PER_Threshold_High:2:",
"PER_Threshold_Low:2:",
"Finish_Assessment_Timer_To:2:",
"Wait_For_Reassessment_Timer_To:2:"],[
"Status:1",
]],

"Ericsson_Write_AFH" => [[ "3F", "0045",
"Connection_Handle:2:",
"AFH_Enable:1:"],[
"Status:1",
"Connection_Handle:2",
]],

"Ericsson_Write_AFH_Enable" => [[ "3F", "0041",
"AFH_Enable:1:"],[
"Status:1",
]],

"Ericsson_Write_Radio_Mode" => [[ "3F", "0042",
"Radio_Mask_Mode:1:"],[
"Status:1",
]],

"Ericsson_Events" => [[ "3F", "0043",
"Event_Mask:1:",
"LMP_OpCode:1:",
"LMP_ExtOpCode:1:"],[
"Status:1",
]],

"Ericsson_Read_PER" => [[ "3F", "0044"],[
"Status:1",
"PER:2",
]],

"Ericsson_Get_LT_Address" => [[ "3F", "0046",
"Connection_Handle:2:"],[
"Status:1",
"LT_Addr:1",
]],

"Ericsson_Read_LT_ADDR" => [[ "3F", "0046",
"Connection_Handle:2:"],[
"Status:1",
"LT_Addr:1",
]],

"Ericsson_Set_Featurebit" => [[ "3F", "0047",
"Byte:1:",
"Bit:1:",
"Value:1:"],[
"Status:1",
]],

"Ericsson_Write_Compatibility_Mode" => [[ "3F", "0048",
"Mode:1:"],[
"Status:1",
]],

"Sushi_Mode_Config" => [[ "3F", "004F",
"Enable_Coex_Mode:1:",
"Allow_Tx_Collision:1:",
"T_Lead:1:",
"T_Tail:1:",
"Sync_Period:2:",
"Sync_Pulse_Width:2:",
"T_Sync_Lead:1:",
"Sync_Mode:1:"],[
"Status:1",
]],

"TCD_Test_Setup" => [[ "3F", "005C",
"Connection_Handle:2:",
"Test_Action:1:",
"Test_Category:1:",
"Test_Case:1:",
"Sync_Point:1:",
"Test_Packet_0:1:",
"Test_Packet_1:1:",
"Test_Packet_2:1:"],[
"Status:1",
]],

"Marvell_Read_CPU" => [["3F", "0056",
"Register_Stats:1:"],[
"Status:1",
"CPU_idle:1"
]],

"Marvell_Read_Radio_Register" => [["3F", "0063",
"Register_Address:2:",
"Number_Of_Bytes_Read:1:"],[
"Status:1",
"Register_Value:4"
]]
,
"Marvell_Read_Firmware_Revision" => [["3F", "000F"],[
"Status:1",
"Firmware_Version:4",
"ROM_Version:4"]],

"Marvell_Read_Memory" => [["3F", "0001",
"Start_Mem_Address:2:",
"Number_Of_Registers:1:"],[
"Status:1",
"Register_Value:4"
]],

"FM_Get_Firmware_Version" => [["3F", "0280",
"Get_Firmware_Version:1:30"],[
"FM_Get_Firmware_Version:1",
"FM_Firmware_Version:6"
]],

"Marvell_BLE_Power_Save_Mode" => [["3F", "008B",
"Power_Save_Mode:1:"],["Status:1",]],

"Ericsson_Write_Scan_Triggering" => [[ "3F", "0008",
"Setting0:1:",
"Setting1:1:",
"Setting2:1:",
"Setting3:1:",
"Setting4:1:",
"Setting5:1:",
"Setting6:1:",
"Setting7:1:",
"Setting8:1:",
"Setting9:1:"],[
"Status10:1",
]],

"FM_Reset"=>[["3F", "0280",
"Reset:1:00"],[
"Status:1",
"CMD:1",
"Reset:1",]],

"FM_Receiver_Initialize" =>[["3F", "0280",
"FM_Init_CMD:1:01",
"Set_Crystal_Frequency:4:00 F0 49 02"],[
"Status:1",
"CMD:1",
"FM_Initialize:1",
]],

"FM_Set_Mode" =>[["3F", "0280",     ##FM_Enable in CAC API
"FM_Set_Mode:1:02",
"Set_Power_Mode:1"],[
"Status:1",
"CMD:1",
"FM_Set_Transreceiver_Mode:1",
]],


"FM_Get_Current_RSSI" => [["3F", "0280",
"Get_Current_RSSI:1:34"],[
"Status:1",
"CMD:1",
"FM_Get_Current_RSSI:1",
"FM_RSSI_Level:2:",
]],

"FM_Get_Current_CMI" => [["3F", "0280",
"Get_Current_CMI:1:5F"],[
"Status:1",
"CMD:1",
"FM_Get_Current_CMI:1",
"FM_CMI_Level:2",
]],

"FM_Select_Rx_Antenna" => [["3F", "0280",
"Get_Current_CMI:1:55",
"Antenna_Type:1"],[
"Status:1",
"CMD:1",
"FM_Select_Rx_Antenna:1",
]],

"FM_Set_Interrupt_Mask" => [["3F", "0280",   ## in CAC, Mask length sent has been reduced to 2 byte
"Set_Interrupt_Mask:1:2E",
"Mask:4:"],[
"Status:1",
"CMD:1",
"FM_Set_Interrupt_Mask:1",
]],

"FM_Get_Interrupt_Mask" => [[ "3F", "0280",  ## in CAC, Mask length received has been reduced to 2 byte
"Get_Interrupt_Mask:1:2F"],[
"Status:1",
"CMD:1",
"FM_Get_Interrupt_Mask:1",
"FM_Interrupt_Mask:4",
]],

"FM_Get_Current_Flags" => [["3F", "0280",
"Get_Flags:1:1F"],[
"Status:1",
"CMD:1",
"FM_Get_Flags:1",
]],

"FM_Power_Down" => [["3F", "0280",
"FM_Power_Down:1:9F"],[
"Status:1",
"CMD:1",
"FM_Power_Down:1",
]],

"FM_Set_Channel" => [["3F", "0280",   ## FM Set_Channel in CAC API dont have band_scan_mode
"Set_Channel:1:03",
"Channel_Frequency:4",
"Band_Scan_Mode:1"],[
"Status:1",
"CMD:1",
"FM_Set_Channel:1",
"Frequency:4",
]],

"FM_Get_Channel" => [["3F", "0280",
"Get_Channel:1:04"],[
"Status:1",
"CMD:1",
"FM_Get_Channel:1",
"FM_Channel_Frequency:4",
]],

"FM_Set_AF_Channel" => [["3F", "0280",   ## In CAC, jump condition is not used as parameter 
"Set_AF_Channel:1:05",
"AF_Channel_Frequency:4",
"Jump_Condition:1"],[
"Status:1",
"CMD:1",
"FM_Set_AF_Channel:1",
"AF_Channel_Frequency:4",
]],

"FM_Set_Search_Direction" => [["3F", "0280",
"Set_Direction:1:07",
"Search_Direction:1"],[
"Status:1",
"CMD:1",
"FM_Set_Search_Direction:1",
]],

"FM_Get_Search_Direction" => [["3F", "0280",
"Get_Direction_Command:1:08"],[
"Status:1",
"CMD:1",
"FM_Get_Search_Direction:1",
"FM_Current_Search_Direction:1",
]],

"FM_Set_Auto_Search_Mode" => [["3F", "0280",
"Set_Search_Mode:1:09",
"Search_Mode:1"],[
"Status:1",
"CMD:1",
"FM_Set_Search_Mode:1",
]],

"FM_Get_Auto_Search_Mode" => [["3F", "0280",
"Get_Search_Mode:1:0A"],[
"Status:1",
"CMD:1",
"FM_Get_Search_Mode:1",
"FM_Search_Mode:1",
]],

"FM_Stop_Search" => [["3F", "0280",
"Stop_Search:1:57"],[
"Status:1",
"CMD:1",
"FM_Stop_Channel_Search:1",
]],

"FM_Set_Force_Mono_Mode" => [["3F", "0280",  # In CAC, FM_Set_Force_Audio_Mode is used instead Mono
"Set_Force_Mono:1:0B",
"Mono:1"],[
"Status:1",
"CMD:1",
"FM_Set_Force_Mono:1",
]],

"FM_Get_Force_Mono_Mode" => [["3F", "0280",  # In CAC, FM_Set_Force_Audio_Mode is used instead Mono
"Get_Force_Mono_Mode:1:0C"],[
"Status:1",
"CMD:1",
"FM_Get_Force_Mono:1",
"FM_Force_Mono:1",
]],

"FM_Stereo_Blending_Configure" => [["3F", "0280", ###in CAC above command is replaced with FM_Set_Stereo_Blending_Time_Constant
"Stereo_Blending_Configure:1:5C",
"Time_Constant:1"],[
"Status:1",
"CMD:1",
"Configure_Stereo_Blending:1",
]],

"FM_Set_Stereo_Blending_Time_Constant" => [["3F", "0280",   
"Stereo_Blending_Time_Constant:1:5C",
"Time_Constant:1"],[
"Status:1",
"CMD:1",
"Stereo_Blending_Time_Constant:1",
]],

"FM_Get_Stereo_Status" => [["3F", "0280",
"Get_Stereo_Status:1:60"],[
"Status:1",
"CMD:1",
"FM_Get_Stereo_Status:1",
"FM_Stereo_Status:1",
]],

"FM_Set_CMI_Status" => [["3F", "0280",
"Set_Threshold:1:11",
"CMI_Threshold:2"],[
"Status:1",
"CMD:1",
"FM_Set_CMI_Threshold:1",
]],

"FM_Get_CMI_Status" => [["3F", "0280",
"Get_Threshold:1:12"],[
"Status:1",
"CMD:1",
"FM_Get_CMI_Threshold:1",
"CMI_Threshold:2",
]],

"FM_Set_RSSI_Threshold" => [["3F", "0280",   #### on older chipset
"Set_RSSI:1:63",
"RSSI_Threshold:2:8001"],[
"Status:1",
"CMD:1",
"FM_Set_RSSI_Threshold:1",
]],

"FM_Get_RSSI_Threshold" => [["3F", "0280",   #### on older chipset
"Get_RSSI_Threshold:1:64"],[
"Status:1",
"CMD:1",
"FM_Get_RSSI_Threshold:1",
"FM_RSSI_Threshold:2",
]],

"FM_Set_FM_Band" => [["3F", "0280",  ############older chip
"Set_FM_Band:1:13",
"FM_Band:1"],[
"Status:1",
"CMD:1",
"FM_Set_FM_Band:1",
]],

"FM_Set_FM_Band" => [["3F", "0280",
"Set_FM_Band:1:13",
"Upper_Limit:4",
"Lower_Limit:4",
"Step_Size:1",
"First_Good_Channel:4"],[
"Status:1",
"CMD:1",
"FM_Set_FM_Band:1",
]],

"FM_Set_Channel_Step_Size" => [["3F", "0280",
"Set_Channel_Step_Size:1:35",
"Step_Size:4"],[
"Status:1",
"CMD:1",
"FM_Set_Channel_Step_Size:1",
]],

"FM_Channel_Up" => [["3F", "0280",  ################# Not in CAC
"Channel_Up:1:37"],[
"Status:1",
"CMD:1",
"FM_Channel_Up:1",
"Channel_Frequency:4",
]],

"FM_Channel_Down" => [["3F", "0280",  ################# Not in CAC
"Channel_Down:1:38"],[
"Status:1",
"CMD:1",
"FM_Channel_Down:1",
"Channel_Frequency:4",
]],

"FM_Set_Audio_Deemphasis" => [["3F", "0280",
"Set_Deemphasis:1:0F",
"Deemphasis:1"],[
"Status:1",
"CMD:1",
"FM_Set_Audio_Deemphasis:1",
]],

"FM_Set_Audio_Volume" => [["3F", "0280",
"Set_Volume:1:65",
"Volume:2"],[
"Status:1",
"CMD:1",
"FM_Set_Audio_Volume:1",
]],

"FM_Get_Audio_Volume" => [["3F", "0280",
"Get_Volume:1:66"],[
"Status:1",
"CMD:1",
"FM_Get_Audio_Volume:1",
"FM_Volume:2",
]],

"FM_Enable_Soft_Mute" => [["3F", "0280",   ##old chipset
"Enable_Soft_Mute:1:61",
"Enable:1",
"Mute_Threshold:1",
"Audio_Attenuation:1"],[
"Status:1",
"CMD:1",
"FM_Enable_Soft_Mute:1"
]],

"FM_Enable_Soft_Mute" => [["3F", "0280",  ##Adding slope attenuation in earlier commands
"Enable_Soft_Mute:1:61",
"Enable:1",
"Mute_Threshold:2",
"Audio_Attenuation:2",
"Slop:1"],[
"Status:1",
"CMD:1",
"FM_Enable_Soft_Mute:1"
]],

"FM_Get_Soft_Mute_Status" => [["3F", "0280",
"Enable_Soft_Mute:1:62"],[
"Status:1",
"CMD:1",
"FM_Get_Soft_Mute_Mode:1",
"FM_Soft_Mute_Status:1",
]],

"FM_Power_Down" => [["3F", "0280",     ###New for CAC
"Power_Down:1:9F"],[
"Status:1",
"CMD:1",
]],

"FM_Set_Mute_Mode" => [["3F", "0280",
"Set_Mute_Mode:1:15",
"Mute:1"],[
"Status:1",
"CMD:1",
"FM_Set_Mute_Mode:1",
]],

"FM_Get_Mute_Mode" => [["3F", "0280",
"Get_Mute_Mode:1:16"],[
"Status:1",
"CMD:1",
"FM_Get_Mute_Mode:1",
"FM_Current_Mute_Mode:1",
]],

"FM_Set_Audio_Path" => [["3F", "0280",
"Set_Audio_Path:1:1A",
"Audio_Path:1",
"I2S_Opernation:1",
"I2S_Mode:1"],[
"Status:1",
"CMD:1",
"FM_Set_Audio_Path:1",
]],

"FM_Get_Audio_Path" => [["3F", "0280",
"Get_Audio_Path:1:1B"],[
"Status:1",
"CMD:1",
"FM_Get_Audio_Path:1",
"FM_Current_Audio_Path:1",
]],

"FM_Get_I2S_Parameters" => [["3F", "0280",
"Get_I2S_Paramaters:1:68",
"Channel_Frequency:4"],[
"Status:1",
"CMD:1",
"FM_Get_I2S_Parameters:1",
"FM_Sampling_Frequency:1",
"FM_BLCK-LRCLK_Division_Factor:1",
]],

"FM_Set_Audio_Sampling_Rate" => [["3F", "0280",
"Set_Audio_Sampling_Rate:1:3F",
"Sampling_Rate:1",
"BLCK-LRCLK_Division_Factor:1"],[
"Status:1",
"CMD:1",
"FM_Set_Audio_Sampling_Rate:1",
]],

"FM_Enable_Audio_Pause" => [["3F", "0280",
"Audio_Pause:1:3D",
"Mode:1"],[
"Status:1",
"CMD:1",
"FM_Enable_Audio_Pause_Detection:1",
]],

"FM_Set_Audio_Pause_Duration" => [["3F", "0280",
"Set_Audio_Pause_Duration:1:3C",
"Pause_Duration:1"],[
"Status:1",
"CMD:1",
"FM_Set_Pause_Duration:1"
]],

"FM_Set_Audio_Pause_Level" => [["3F", "0280",
"Set_Audio_Pause_Level:1:17",
"Threshold_Level:2"],[
"Status:1",
"CMD:1",
"FM_Set_Pause_Level:1",
]],

"FM_Get_PLL_Lock_Status" => [["3F", "0280",
"Get_PLL_Lock_Status:1:3E"],[
"Status:1",
"CMD:1",
"FM_Get_PLL_Lock_Status:1",
"FM_PLL_Lock_Status:1",
]],

"FM_Get_RDS_Sync_Status"=>[["3F", "0280",
"Get_Sync_Status:1:1E"],[
"Status:1",
"Get_Sync_Status:1",
"FM_RX_RDS_Sync_Status:1",
"FM_Current_Sync_Status:1",
]],

"FM_Get_RDS_Data" => [["3F", "0280",
"Get_RDS_Data:1:20"],[
"Status:1",
"Get_RDS_Data:1",
"FM_Get_RDS_Data:1",
"FM_RDS_Data:20",]],

"FM_RDS_Flush" => [["3F", "0280",
"Flush_RDS_Data:1:21"],[
"Status:1",
"Flush_RDS_Data:1",
"FM_Flush_RDS_Data:1",]],

"FM_Set_RDS_Memory_Depth" => [["3F", "0280",
"Set_Memory_Depth:1:22",
"Depth:1"],[
"Status:1",
"Set_Memory_Depth:1",
"FM_Set_RDS_Memory_Depth:1",]],

"FM_Get_RDS_Memory_Depth" => [["3F", "0280",
"Get_Memory_Depth:1:23"],[
"Status:1",
"Get_Memory_Depth:1",
"FM_Get_RDS_Memory_Depth:1",
"FM_Curent_RDS_Memory_Depth:1",]],

"FM_Set_RDS_Block_B" => [["3F", "0280",
"Set_Block_B:1:24",
"Block_B:2"],[
"Status:1",
"Set_Block_B:1",
"FM_Set_RDS_Block_B:1",]],

"FM_Get_RDS_Block_B" => [["3F", "0280",
"Get_Block_B:1:25"],[
"Status:1",
"Get_Block_B:1",
"FM_Get_RDS_Block_B:1",
"FM_Current_RDS_Block_B:2",]], 

"FM_Set_RDS_Block_B_Mask" => [["3F", "0280",
"Set_Block_B_Mask:1:26",
"Block_B:2"],[
"Status:1",
"Set_Block_B_Mask:1",
"FM_Set_RDS_Block_B_Mask:1",]],

"FM_Get_RDS_Block_B_Mask" => [["3F", "0280",
"Get_Block_B_Mask:1:27"],[
"Status:1",
"Get_Block_B:1",
"FM_Set_RDS_Block_B_Mask:1",
"FM_Current_RDS_Block_B_Mask:2",]],

"FM_Set_RDS_PI_Code" => [["3F", "0280",
"Set_PI_Code:1:28",
"PI_Code:2"],[
"Status:1",
"Set_PI_Code:1",
"FM_Set_RDS_PI_Code:1",]],

"FM_Get_RDS_PI_Code" => [["3F", "0280",
"Get_PI_Code:1:29"],[
"Status:1",
"Get_PI_Code:1",
"FM_Get_RDS_PI_Code:1",
"FM_Current_RDS_PI_Code:2",]],

"FM_Set_RDS_PI_Code_Mask" => [["3F", "0280",
"Set_PI_Code_Mask:1:2A",
"PI_Code_Mask:2"],[
"Status:1",
"Set_PI_Code_Mask:1",
"FM_Set_RDS_PI_Code_Mask:1",]],

"FM_Get_RDS_PI_Code_Mask" => [["3F", "0280",
"Get_PI_Code_Mask:1:2B"],[
"Status:1",
"Get_PI_Code_Mask:1",
"FM_Get_RDS_PI_Code_Mask:1",
"FM_Current_RDS_PI_Code_Mask:2",]],

"FM_Set_RBDS_WO_E_Blocks" => [["3F", "0280",
"Set_RBDS_Without_E_Blocks:1:2C",
"RBDS_Without_E_Blocks:1"],[ 
"Status:1",
"Set_RBDS_Without_E_Blocks:1",
"FM_Set_RBDS_Without_E_Blocks:1",]],

"FM_Get_RBDS_WO_E_Blocks" => [["3F", "0280",
"Get_RBDS_Without_E_Blocks:1:2D"],[ 
"Status:1",
"Get_RBDS_Without_E_Blocks:1",
"FM_Get_RBDS_WO_E_Blocks:1",
"FM_Current_RBDS_Without_E_Blocks:1",]],

"FM_Get_Hardware_Version" => [["3F", "0280",
"Get_Hardware_Version:1:31"],[
"Status:1",
"Get_Hardware_Version:1",
"FM_Get_Hardware_Version:1",
"FM_Hardware_Version:4",]],

"FM_Get_Hardware_ID" => [["3F", "0280",
"Get_Hardware_ID:1:32"],[
"Status:1",
"Get_Hardware_ID:1",
"FM_Get_Hardware_ID:1",
"FM_Hardware_Version:4",]],

"FM_Get_Hardware_Manufacturer_ID" => [["3F", "0280",
"Get_Manufacture_ID:1:33"],[
"Status:1",
"Get_Manufacture_ID:1",
"FM_Get_Manufacture_ID:1",
"FM_Manufacture_ID:4",]],

"FM_Set_Output_Power"=> [["3F", "0280",
"Set_Output_Power:1:40",
"Target_Output_Power:1"],[
"Status:1",
"Set_Output_Power:1",
"FM_Set_Tx_Output_Power:1",]],

"FM_Get_Output_Power"=> [["3F", "0280",
"Get_Output_Power:1:68"],[
"Status:1",
"Get_Output_Power:1",
"FM_Get_Tx_Output_Power:1",
"FM_Output_Power:1",]],

"FM_Set_Output_Power_Mode"=> [["3F", "0280",
"Set_Output_Power_Mode:1:5D",
"Mode:1"],[
"Status:1",
"Set_Output_Power_Mode:1",
"FM_Set_Output_Power_Mode:1",]],

"FM_Set_Frequency_Deviation" => [["3F", "0280",
"Set_Frequency_Deviation:1:45",
"Frequency_Deviation:4"],[
"Status:1",
"Set_Frequency_Deviation:1",
"FM_Set_Tx_MPX_Frequency_Deviation:1",]],

"FM_Set_Frequency_Deviation_Extended" => [["3F", "0280",
"Frequency_Deviation:1:41",
"LPR_Deviation:4",
"LMR_Deviation:4",
"Pilot_Deviation:4",
"RDS_Deviation:4"],[
"Status:1",
"Frequency_Deviation:1",
"FM_Set_Tx_Gain:1",]],

"FM_Set_Tx_Mono_Stereo" => [["3F", "0280",
"Set Tx Mono_stereo:1:46",
"Audio_Channel_Separation:1"],[
"Status:1",
"Set Tx Mono_stereo:1",
"FM_Set_Tx_Mono_Stereo:1",]],

"FM_Set_Mute" => [["3F", "0280",
"Set_Mute:1:47",
"Mute:1"],[
"Status:1",
"Set_Mute:1",
"FM_Set_Tx_Mute:1",]],

"FM_Config_Audio_Input"=> [["3F", "0280",
"Config_Audio_Input:1:56",
"Audio_Input_Gain:1",
"Active_Audio_Channel:1"],[
"Status:1",
"Config_Audio_Input:1",
"FM_Configure_Audio_Input:1",]],

"FM_Enable_Tx_Audio_AGC"=> [["3F", "0280",
"Enable_Tx_Audio_AGC:1:5B",
"Tx_Audio_AGC:1"],[
"Status:1",
"Enable_Tx_Audio_AGC:1",
"FM_Enable_Tx_Audio_AGC:1",]],

"FM_Set_RDS_PI_Code"=> [["3F", "0280",
"Set_RDS_PI_Code:1:48",
"PI_Code:2"],[
"Status:1",
"Set_RDS_PI_Code:1",
"FM_Set_Tx_RDS_PI_Code:1",]],

"FM_Set_RDS_Group"=> [["3F", "0280",
"Set_RDS_Group:1:49",
"RDS_Group:1"],[
"Status:1",
"Set_RDS_Group:1",
"FM_Set_Tx_RDS_Group:1",]],

"FM_Set_RDS_PTY"=> [["3F", "0280",
"Set_RDS_PTY:1:4A",
"PTY:1"],[
"Status:1",
"Set_RDS_PTY:1",
"FM_Set_Tx_RDS_Group:1",]],

"FM_Set_RDS_AF"=> [["3F", "0280",
"Set_RDS_AF:1:4B",
"AF_Code:1"],[
"Status:1",
"Set_RDS_AF:1",
"FM_Set_Tx_RDS_AF:1",]],

"FM_Set_RDS_Mode"=> [["3F", "0280",
"Set_RDS_Mode:1:4C",
"RDS_Tx_Mode:1"],[
"Status:1",
"Set_RDS_Mode:1",
"FM_Set_Tx_RDS_Mode:1",]],

"FM_Set_RDS_Scrolling"=> [["3F", "0280",
"Set_RDS_Scrolling:1:4D",
"Scrolling:1"],[
"Status:1",
"Set_RDS_Scrolling:1",
"FM_Set_Tx_RDS_Scrolling:1",]],


"FM_Set_RDS_Scrolling_Rate"=> [["3F", "0280",
"Set_RDS_Scrolling_Rate:1:4E",

"Rate:1"],[
"Status:1",
"Set_RDS_Scrolling_Rate:1",
"FM_Set_Tx_RDS_Scrolling_Rate:1",]],

"FM_Set_RDS_Display_Length"=> [["3F", "0280",
"Set_RDS_Display_Length:1:4F",
"Size:1"],[
"Status:1",
"Set_RDS_Display_Length:1",
"FM_Set_Tx_RDS_Display_Size:1",]],

"FM_Set_RDS_Toggle_AB"=> [["3F", "0280",
"Set_RDS_Toggle_AB:1:50"],[
"Status:1",
"Set_RDS_Toggle_AB:1",
"FM_Set_Tx_RDS_Toggle_AB:1",]],

"FM_Set_RDS_Repository"=> [["3F", "0280",
"Set_RDS_Repository:1:51",
"Repository:1"],[
"Status:1",
"Set_RDS_Repository:1",
"FM_Set_Tx_RDS_Repository:1",]],


"FM_Set_RDS_Data_String"=> [["3F", "0280",
"Set_RDS_Data:1:52",
"Lenght:1",
"Message:FD"],[
"Status:1",
"Set_RDS_Data:1",
"FM_Set_Tx_RDS_Data:1",]],

"FM_Reset_RDS_Stat"=> [["3F", "0280",
"RDS_Status_Reset:1:9D",
"Period_Counter_Limit:4"],[
"Status:1",
"RDS_Status_Reset:1",
"FM_Reset_RDS_Status:1",]],


"FM_Get_RDS_Stat"=> [["3F", "0280",
"Get_RDS_Status:1:9E"],[
"Status:1",
"FM_Get_RDS_Status:1",
"FM_Get_Tx_RDS_Status:1",
"FM_Number_Of_Good_Blocks:2",
"FM_Number_of_Not_Synchronized_Blocks:2",
"FM_Expected_Blocks:2",
"FM_Success_Rate:1",
]],

#Payal Added AES commands:
"HCI_Set_Secure_Connections_Host_Support" => [[ "03", "007A",
"Secure_Connection_Host_Support:1:"],[
"Status:1",
]],

"HCI_Write_Secure_Connections_Only_Mode" => [[ "03", "0071",
"Secure_Connection_Only:1:"],[
"Status:1",
]],

"HCI_Read_Maximum_Authentication_Interval" => [[ "03", "007B",
"Connection_Handle:2:"],[
"Status:1",
"Connection_Handle:2",
"Maximum_Authentication_Interval:2",
]],

"HCI_Write_Maximum_Authentication_Interval" => [[ "03", "007C",
"Connection_Handle:2:",
"Maximum_Authentication_Interval:2:"],[
"Status:1",
"Connection_Handle:2",
]],

"Read_Local_OOB_Extended_Data" => [[ "03", "007D"],[
"Status:1",
"Hash_C_192:16",
"Randomizer_R_192:16",
"Hash_C_256:16",
"Randomizer_R_256:16",
]],

"Remote_OOB_Extended_Data_Request_Reply" => [[ "01", "0045",
"BD_ADDR:6",
"Hash_C_192:16",
"Randomizer_R_192:16",
"Hash_C_256:16",
"Randomizer_R_256:16"],[
"Status:1",
"BD_ADDR:6",
]],

#BroadCom Vendor Specific Commands to Route Data
#"Broadcomm_Route_1" => [[ "3F", "0022",
#"ARGV1:1:"
#],[
#"Status:1:",
#]],

#"Broadcomm_Route_2" => [[ "3F", "001C",
#"ARGV1:1:",
#"ARGV2:1:",
#"ARGV3:1:",
#"ARGV4:1:",
#"ARGV5:1:"
#],[
#"Status:1:",
#]],

);

#*************************HCI Events********************************************
%hci_event = (
    
"01" => [ "Inquiry_Complete_Event",
"Status:1",
],

"02" => [ "Inquiry_Result_Event",
"Num_Responses:1",
"BD_ADDR:6",
"Page_Scan_Repetition_Mode:1",
"Page_Scan_Period_Mode:1",
"Page_Scan_Mode:1",
"Class_Of_Device:3",
"Clock_Offset:2",
],

"2F" => [ "Inquiry_EIR_Result_Event",
"Num_Responses:1",
"BD_ADDR:6",
"Page_Scan_Repetition_Mode:1",
"Page_Scan_Period_Mode:1",
"Class_Of_Device:3",
"Clock_Offset:2",
"RSSI:1",
"EIR_Data:240",
],

"03" => [ "Connection_Complete_Event",
"Status:1",
"Connection_Handle:2",
"BD_ADDR:6",
"Link_Type:1",
"Encryption_Mode:1",
],

"04" => [ "Connection_Request_Event",
"BD_ADDR:6",
"Class_of_Device:3",
"Link_Type:1",
],

"05" => [ "Disconnection_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Reason:1",
],

"06" => [ "Authentication_Complete_Event",
"Status:1",
"Connection_Handle:2",
],

"07" => [ "Remote_Name_Request_Complete_Event",
"Status:1",
"BD_ADDR:6",
"Remote_Name:248",
],

"08" => [ "Encryption_Change_Event",
"Status:1",
"Connection_Handle:2",
"Encryption_Enable:1",
],

"09" => [ "Change_Connection_Link_Key_Complete_Event",
"Status:1",
"Connection_Handle:2",
],

"0A" => [ "Master_Link_Key_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Key_Flag:1",
],

"0B" => [ "Read_Remote_Supported_Features_Complete_Event",
"Status:1",
"Connection_Handle:2",
"LMP_Features:8",
],

"0C" => [ "Read_Remote_Version_Information_Complete_Event",
"Status:1",
"Connection_Handle:2",
"LMP_Version:1",
"Manufacturer_Name:2",
"LMP_SubVersion:2",
],

"0D" => [ "QoS_Setup_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Flags:1",
"Service_Type:1",
"Token_Rate:4",
"Peak_Bandwidth:4",
"Latency:4",
"Delay_Variation:4",
],

"0E" => [ "Command_Complete_Event",
"Num_HCI_Command_Packets:1",
"Command_Opcode:2",
"Return_Parameters:2",
],

"0F" => [ "Command_Status_Event",
"Status:1",
"Num_HCI_Command_Packets:1",
"Command_Opcode:2",
],

"10" => [ "Hardware_Error_Event",
"Hardware_Code:1",
],

"11" => [ "Flush_Occurred_Event",
"Connection_Handle:2",
],

"12" => [ "Role_Change_Event",
"Status:1",
"BD_ADDR:6",
"New_Role:1",
],

"13" => [ "Number_Of_Completed_Packets_Event",
":1",
"Connection_Handle:2",
"HC_Num_Of_Completed_Packets:2",
],

"14" => [ "Mode_Change_Event",
"Status:1",
"Connection_Handle:2",
"Current_Mode:1",
"Interval:2",
],

"15" => [ "Return_Link_Keys_Event",
"Num_Keys:1",
"BD_ADDR:6",
"Link_Key:16",
],

"16" => [ "PIN_Code_Request_Event",
"BD_ADDR:6",
],

"17" => [ "Link_Key_Request_Event",
"BD_ADDR:6",
],

"18" => [ "Link_Key_Notification_Event",
"BD_ADDR:6",
"Link_Key:16",
"Key_Type:1",
],

"19" => [ "Loopback_Command_Event",
"HCI_Command_Packet:",
],

"1A" => [ "Data_Buffer_Overflow_Event",
"Link_Type:1",
],

"1B" => [ "Max_Slots_Change_Event",
"Connection_Handle:2",
"LMP_Max_Slots:1",
],

"1C" => [ "Read_Clock_Offset_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Clock_Offset:2",
],

"1D" => [ "Connection_Packet_Type_Changed_Event",
"Status:1",
"Connection_Handle:2",
"Packet_Type:2",
],

"1E" => [ "QoS_Violation_Event",
"Connection_Handle:2",
],

"1F" => [ "Page_Scan_Mode_Change_Event",
"BD_ADDR:6",
"Page_Scan_Mode:1",
],

"20" => [ "Page_Scan_Repetition_Mode_Change_Event",
"BD_ADDR:6",
"Page_Scan_Repetition_Mode:1",
],

"21" => [ "Flow_Specification_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Flags:1",
"Flow_Direction:1",
"Service_Type:1",
"Token_Rate:4",
"Token_Bucket_Size:4",
"Peak_Bandwidth:4",
"Access_Latency:4",
],

"22" => [ "Inquiry_Result_Event_With_RSSI",
"Num_Responses:1",
"BD_ADDR:6",
"Page_Scan_Repetition_Mode:1",
"Reserved:1",
"Class_Of_Device:3",
"Clock_Offset:2",
"RSSI:1",
],

"23" => [ "Read_Remote_Extended_Features_Complete_Event",
"Status:1",
"Connection_Handle:2",
"Page_Number:1",
"Max_Page_Number:1",
"Extended_LMP_Features:8",
],

"2C" => [ "Synchronous_Connection_Complete_Event",
"Status:1",
"Connection_Handle:2",
"BD_ADDR:6",
"Link_Type:1",
"Transmission_Interval:1",
"Retransmission_Window:1",
"Rx_Packet_Length:2",
"Tx_Packet_Length:2",
"Air_mode:1",
],

"2D" => [ "Synchronous_Connection_Changed_Event",
"Status:1",
"Connection_Handle:2",
"Transmission_Interval:1",
"Retransmission_Window:1",
"Rx_Packet_Length:2",
"Tx_Packet_Length:2",
],

"2E" => [ "Sniff_Subrate_Event",
"Status:1",
"Connection_Handle:2",
"Max_Transmit_Latency:2",
"Max_Receive_Latency:2",
"Min_Remote_Timeout:2",
"Min_Local_Timeout:2",
],

"30" => [ "Encryption_Key_Refresh_Complete_Event",
"Status:1",
"Connection_Handle:2",
],

"31" => [ "IO_Capability_Request_Event",
"BD_ADDR:6",
],

"32" => [ "IO_Capability_Response_Event",
"BD_ADDR:6",
"IO_Capability:1",
"OOB_Data_Present:1",
"Auth_Requirements:1",
],

"33" => [ "User_Confirmation_Request_Event",
"BD_ADDR:6",
"Numeric_Value:4",
],

"34" => [ "User_PassKey_Request_Event",
"BD_ADDR:6",
],

"35" => [ "Remote_OOB_Data_Request_Event",
"BD_ADDR:6",
],

"36" => [ "Simple_Pairing_Complete_Event",
"Status:1",
"BD_ADDR:6",
],

"38" => [ "Link_Supervision_Timeout_Changed_Event",
"Connection_Handle:2",
"Link_Supervision_Timeout:2",
],

"3B" => [ "User_PassKey_Notification_Event",
"BD_ADDR:6",
"PassKey:4",
],

"3C" => [ "User_Keypress_Notification_Event",
"BD_ADDR:6",
"Notification_Type:1",
],

"3D" => [ "Remote_Host_Supported_Features_Event",
"BD_ADDR:6",
"Remote_Host_Features:8",
],


####LE Meta Event#####
"3E" => [ "LE_Meta_Event",
          "Subevent_Code:1",
         {
            "01" => ["Status:1",
                     "Connection_Handle:2",
                     "Role:1",
                     "Peer_Address_Type:1",
                     "Peer_Address:6",
                     "Conn_Interval:2",
                     "Conn_Latency:2",
                     "Supervision_Timeout:2",
                     "Master_Clock_Accuacy:1",
                     ],
                     
            "02" => ["Num_Reports:1",
                     "Event_Type:1",
                     "Address_Type:1",
                     "Address:6",
                     "Length_Data:1",
                     "Data:",
                     "RSSI:1",
                     ],
                     
           "03" => [ "Status:1",
		     "Connection_Handle:2",
		     "Connection_Interval:2",
                     "Conn_Latency:2",
                     "Supervision_Timeout:2",
		     ],
          "04" => [ "Status:1",
		     "Connection_Handle:2",
		     "LE_Features:8", 	
		     ],
	   "05" => [ "Connection_Handle:2",
  		     "Random_Number:8",
		     "Encryption_Diversifier:2",
		     ]
         }],

"FF" => [ "Vendor_Specific_Event",
         "Event_ID:1",
         {
          "01" => ["OSE_Error_Code:1",
                   "OSE_Process_Id:1",
                   "OSE_PCB_Address:1",
                   "OSE_Stack_Pointer:1",
                   "OSE_User_Or_OS_Error:1"],
          "04" => ["Owner:1",
                   "Size:2",
                   "Header:1",
                   "Sender:1",
                   "Signal_Number:1"],
          "06" => ["String_Length:1",
                   "String:248"],
          "07" => ["Process_Id:1",
                   "Error_Type:1",
                   "Error_Code:4",
                   "Stack_Pointer:4"],
          "10" => ["Direction:1",
                   "Connection_Handle:2",
                   "TID:1",
                   "Length:1",
                   "OpCode:1",
                   {
                   "01" => ["name_offset:1"], #LMP_name_req
                   "02" => ["name_offset:1", #LMP_name_res
                            "name_length:1",
                            "name_fragment:14"],
                   "03" => ["Op_Code:1"], #LMP_accepted
                   "04" => ["Op_Code:1", #LMP_not_accepted
                            "Reason:1"],
                   #"05" => [],
                   "06" => ["Clock_offset:2"],
                   "07" => ["Reason:1"],
                   "08" => ["Random_number:8"],
                   "09" => ["Random_number:16"],
                   "0A" => ["Key:16"],
                   "0B" => ["Random_number:16"],
                   "0C" => ["authentication_response:4"],
                   "0D" => [ "random_number:16"],
                   "0E" => [ "key:16"],
                   "0F" => ["Encryption_mode:1"],
                   "10" => ["Key_size:1"],
                   "11" => ["random_number:16"],
                   #"12" =>
                   "13" => ["switch_instant:4"],
                   "14" => ["Hold_time:2",
                            "Hold_instant:4"],
                   "15" => ["Hold_time:2",
                            "Hold_instant:4"],
                   "17" => ["Timing_Control_Flags:1",
                            "Dsniff:2",
                            "Tsniff:2",
                            "Sniff_Attempt:2",
                            "Sniff_Timeout:2"],
                   #"18" => 
                   "19" => ["Timing_Control_Flags:1",
                            "Db:2",
                            "Tb:2",
                            "Nb:1",
                            "DELTAb:1",
                            "PM_ADDR:1",
                            "AM_ADDR:1",
                            "Nbsleep:1",
                            "DBsleep:1",
                            "Daccess:1",
                            "Taccess:1",
                            "Naccslots:1",
                            "Npoll:1",
                            "Access_scheme:1",],
                   "1B" => [ "timing_control_flags:1",
                            "broadcast_scan_window:2"],
                   "1C" => ["timing_control_flags:1",
                            "Tb:2",
                            "Nb:1",
                            "DELTAb:1",
                            "Daccess:1",
                            "Taccess:1",
                            "Naccslots:1",
                            "Npoll:1"],
                   "1E" => ["timing_control_flags:1",
                            "LT_ADDR:1",
                            "PM1:1"],
                   "1F" => ["Reserved:1"],
                   "20" => ["Reserved:1"],
                    #(OpCode = 0x21) //LMP_max_power
                    #(OpCode = 0x22) //LMP_min_power
                    #(OpCode = 0x23) //LMP_auto_rate
                    "24" => ["data_rate:1"],
                    "25" => ["VersNr:1",
                             "CompId:2",
                             "SubVersNr:2"],
                    "27" => [ "Features:8"],
                    "28" => [ "Features:8"],
                    "29" => ["poll_interval:2",
                             "NBC:1"],
                    "2A" => ["poll_interval:2",
                             "NBC:1"],
                    "2B" => ["SCO_handle:1",
                             "timing_control_flags:1",
                             "Dsco:1",
                             "Tsco:1",
                             "SCO_packet:1",
                             "air_mode:1",],
                    "2C" => ["SCO_handle:1",
                             "error_code:1"],
                    "2D" => ["Max_slots:1"],
                    "2E" => ["Max_slots:1"],
                    #(OpCode = 0x2F) //LMP_timing_accuracy_req
                    "30" => ["drift:1",
                             "jitter:1"],
                    #(OpCode = 0x31) //LMP_setup_complete
                    #(OpCode = 0x32) //LMP_use_semi_permanent_key
                    #(OpCode = 0x33) //LMP_host_connection_req
                    "34" => ["slot_offset:2",
                             "BD_ADDR:6"],
                    #(OpCode = 0x3A) //LMP_encryption_key_size_mask_req
                    "35" => ["paging_scheme:1",
                             "paging_scheme_settings:1"],
                    "36" => ["paging_scheme:1",
                             "paging_scheme_settings:1"],
                    "37" => ["supervision_timeout:2"],
                    #(OpCode = 0x38) //LMP_test_activate
                    "39" => ["test_scenario:1",
                             "hopping_mode:1",
                             "TX_frequency:1",
                             "RX_frequency:1",
                             "power_control_mode:1",
                             "poll_period:1",
                             "packet_type:1",
                             "length_of_test_data:2"],
                    "3B" => ["Key_size_mask:2"],
                    "3C" => ["RSSI:4",
                             "AFH_Mode:1",
                             "AFH_Channel_Map:10"],
                    "7F" => ["Ext_OpCode4:1",
                             {
                              "01" => ["Escape_Op_Code:1",
                                       "Extended_Op_Code:1"],
                              "02" => ["Escape_Op_Code:1",
                                       "Extended_Op_Code:1",
                                       "Reason:1"],
                              "03" => ["Features_page:1",
                                       "Max_supported_page:1",
                                       "Extended_Features:8"],
                              "04" => ["Features_page:1",
                                       "Max_supported_page:1",
                                       "Extended_Features:8"],
                              "0B" => ["Packet_Type_Table:1"],
                              "0C" => ["eSCO_Handle:1",
                                       "eSCO_LT_ADDR:1",
                                       "Timing_Control_Flags:1",
                                       "D_eSCO:1",
                                       "T_eSCO:1",
                                       "W_eSCO:1",
                                       "SCO_Packet_Type_M_to_S:1",
                                       "SCO_Packet_Type_S_to_M:1",
                                       "Packet_Length_M_to_S:2",
                                       "Packet_Length_S_to_M:2",
                                       "Air_Mode:1",
                                       "Negotiation_Flag:1"],
                              "0D" => ["eSCO_Handle:1",
                                       "Reason:1"],
                              "10" => ["AFH_reporting_mode:1",
                                       "AFH_min_interval:2",
                                       "AFH_max_interval:2"],
                              "11" => ["AFH_channel_classification:10"]
                             }
                             ],
                   }],
			"0B"=>["Connection_Handle:2:",
                  	       "Alert_Type:1:",
			       "RSSI:1:"
				   ],
				   
                "80" => ["FM_Current_Flags:1"],
                "81" => ["FM_RDS_Data:80"],
                "82" => ["FM_RSSI_Level:1"],
                "83" => ["FM_Current_Status:1"],
                "A0" => ["FM_HCI_Generic_Message_Output:1"],
                "FF" => ["HCI cmd return param is 1 byte_FMErrr"],
				"C0" => ["NFC_Vendor_specific_event:2:",
					# "NFC_event:2:04",
			 			"Length_of_command:2:",
			 			"Pipe_ID:1:",
			 			"Command_opcode:1:",	
						{
							"80" => [" : SNFC_HCI_ANY_OK"],
          					"81" => [" : SNFC_HCI_ANY_E_NOT_CONNECTED"],
          					"82" => [" : SNFC_HCI_ANY_E_CMD_PAR_UNKNOWN "],
          					"83" => [" : SNFC_HCI_ANY_E_NOK"],
          					"84" => [" : SNFC_HCI_ADM_E_NO_PIPES_AVAILABLE"],
          					"85" => [" : SNFC_HCI_ANY_E_REG_PAR_UNKNOWN"],
          					"86" => [" : SNFC_HCI_ANY_E_PIPE_NOT_OPENED"],
          					"87" => [" : SNFC_HCI_ANY_E_CMD_NOT_SUPPORTED"],
          					"88" => [" : SNFC_HCI_ANY_E_INHIBITED"],
          					"89" => [" : SNFC_HCI_ANY_E_TIMEOUT"],
							"50" => [" : Detect Device"],
						},
						"Data:120:",
         			],
         	}
         ],

"FE" => [ "Ericsson_Sender_Status_Event",
"Connection_Handle:2",
"Transfer_Rate:2",
"Chunk_Size:2",
"L2CAP_Size:2",
"Loop:1",
"Phase:1",
"Mode:1",
],

"FD" => [ "Ericsson_Receiver_Status_Event",
"Connection_Handle:2",
"Transfer_Rate:2",
"Chunk_Size:2",
"L2CAP_Size:2",
"Phase:1",
"Mode:1",
],

"FC" => [ "Ericsson_Receiver_L2CAP_Loss_Event",
"Connection_Handle:2",
"Expected_Loop:1",
"Received_Loop:1",
"Expected_Phase:1",
"Received_Phase:1",
"Payload_Length_Receiver:2",
"Chunk_Size_Receiver:2",
],

"FB" => [ "Ericsson_Receiver_Unexpected_Start_Event",
"Connection_Handle:2",
"Payload_Length_Receiver:2",
"Bytes_Remaining:2",
"Chunk_Size_Receiver:2",
],

"FA" => [ "Ericsson_Receiver_Error_In_Start_Event",
"Expected_Loop:1",
"Expected_Phase:1",
"Position_of_Erroneous_Byte:2",
"Expected_Byte:1",
"Received_Byte:1",
"Payload_Length_Receiver:2",
"Chunk_Size_Receiver:2",
],

"F9" => [ "Ericsson_Receiver_Error_In_Continue_Event",
"Expected_Loop:1",
"Expected_Phase:1",
"Position_of_Erroneous_Byte:2",
"Expected_Byte:1",
"Received_Byte:1",
"Payload_Length_Receiver:2",
"Chunk_Size_Receiver:2",
],

"F8" => [ "Ericsson_Transfer_Complete_Event",
"Connection_Handle:2",
"Id:1",
],

"F7" => [ "Ericsson_Receiver_Dump_Chunk_Event",
"Data:1",
]
    
);

#######################################################################
###
## CAC_FM Commands are added as it differs from earlier FM commands
###
#######################################################################

%hci_cmd_cac_fm = (

"CAC_FM_Get_Firmware_Version" => [["3F", "0280",
"Get_Firmware_Version:1:30"],[
"FM_Get_Firmware_Version:1",
"FM_Firmware_Version:6"
]],

"FM_Reset"=>[["3F", "0280",
"Reset:1:00"],[
"Status:1",
"CMD:1",
"Reset:1",
]],

"CAC_FM_Receiver_Initialize" =>[["3F", "0280",  ##Modified for CAC 
"FM_Init_CMD:1:01",
"Working_Mode:1:"],[
"Status:1",
"M_Init_CMD:1",
"CAC_FM_Initialize:1",
]],

"CAC_FM_Set_Mode" =>[["3F", "0280",     ##FM_Enable in CAC API
"FM_Set_Mode:1:02",
"Set_Power_Mode:1"],[
"Status:1",
"FM_Set_Mode:1",
"FM_Set_Transreceiver_Mode:1",
]],

"CAC_FM_Get_Current_RSSI" => [["3F", "0280",
"Get_Current_RSSI:1:34"],[
"Status:1",
"CMD:1",
"FM_Get_Current_RSSI:1",
"FM_RSSI_Level:2:",
]],

"CAC_FM_Get_Current_CMI" => [["3F", "0280",
"Get_Current_CMI:1:5F"],[
"Status:1",
"CMD:1",
"FM_Get_Current_CMI:1",
"FM_CMI_Level:2",
]],

"CAC_FM_Set_Interrupt_Mask" => [["3F", "0280",   ## in CAC, Mask length sent has been reduced to 2 byte
"Set_Interrupt_Mask:1:2E",
"Mask:2:"],[
"Status:1",
"CMD:1",
"FM_Set_Interrupt_Mask:1",
]],

"CAC_FM_Get_Interrupt_Mask" => [[ "3F", "0280",   ## in CAC, Mask length received has been reduced to 2 byte
"Get_Interrupt_Mask:1:2F"],[
"Status:1",
"CMD:1",
"FM_Get_Interrupt_Mask:1",
"FM_Interrupt_Mask:2",
]],

"CAC_FM_Get_Current_Flags" => [["3F", "0280",
"Get_Flags:1:1F"],[
"Status:1",
"CMD:1",
"FM_Get_Flags:1",
]],

"CAC_FM_Power_Down" => [["3F", "0280",
"FM_Power_Down:1:9F"],[
"Status:1",
"CMD:1",
"FM_Power_Down:1",
]],

"CAC_FM_Set_Channel" => [["3F", "0280",   ## FM Set_Channel in CAC API
"Set_Channel:1:03",
"Channel_Frequency:4"],[
"Status:1",
"Set_Channel:1",
"FM_Set_Channel:1",
"Frequency:4",
"IsAlignedFreq:1",
]],

"CAC_FM_Get_Channel" => [["3F", "0280",
"Get_Channel:1:04"],[
"Status:1",
"Get_Channel:1",
"FM_Get_Channel:1",
"FM_Channel_Frequency:4",
]],

"CAC_FM_Set_AF_Channel" => [["3F", "0280",   ## In CAC, jump condition is not used as parameter 
"Set_AF_Channel:1:05",
"AF_Channel_Frequency:4"],[
"Status:1",
"Set_AF_Channel:1",
"FM_Set_AF_Channel:1",
"AF_Channel_Frequency:4",
]],

"CAC_FM_Set_Mute_Configuration" => [["3F", "0280",   # New command is added for Mute configuration
"Set_Configuration:1:18",
"Duration:1",
"Level:1"],[
"Status:1",
"Set_Configuration:1",
"FM_Set_Configuration:1",
]],

"CAC_FM_Stop_Search" => [["3F", "0280",
"Stop_Search:1:57"],[
"Status:1",
"Stop_Search:1",
"FM_Stop_Channel_Search:1",
]],

"CAC_FM_Set_Force_Mono_Mode" => [["3F", "0280",  # In CAC, FM_Set_Force_Audio_Mode is used instead Mono
"Set_Force_Mono:1:0B",
"Mono:1"],[
"Status:1",
"Set_Force_Mono:1",
"FM_Set_Force_Mono:1",
]],

"CAC_FM_Get_Force_Mono_Mode" => [["3F", "0280",  # In CAC, FM_Set_Force_Audio_Mode is used instead Mono
"Get_Force_Mono_Mode:1:0C"],[
"Status:1",
"Get_Force_Mono_Mode:1",
"FM_Get_Force_Mono:1",
"FM_Force_Mono:1",
]],

"CAC_FM_Set_Stereo_Blending_Time_Constant" => [["3F", "0280",   ###in CAC above command is replaced with FM_Set_Stereo_Blending_Time_Constant
"Stereo_Blending_Time_Constant:1:5C",
"Time_Constant:1"],[
"Status:1",
"Stereo_Blending_Time_Constant:1",
"FM_Stereo_Blending_Time_Constant:1",
]],

"CAC_FM_Set_Stereo_Blending_Configure" => [["3F", "0280", ##New for CAC
"Stereo_Blending_Configure:1:5D",
"RSSI_Start:2",
"RSSI_Start:2"],[
"Status:1",
"Stereo_Blending_Configure:1",
"FM_Stereo_Blending_Configure:1",
]],

"FM_Get_Stereo_Status" => [["3F", "0280",
"Get_Stereo_Status:1:60"],[
"Status:1",
"Get_Stereo_Status:1",
"FM_Get_Stereo_Status:1",
"FM_Stereo_Status:1",
]],

"CAC_FM_Set_AF_Threshold" => [["3F", "0280",   ###New for CAC
"Set_RSSI:1:63",
"AF_Threshold:2:",
"Metric_Low_Threshold:2"],[
"Status:1",
"Set_RSSI:1",
"Minimum_FM_Metric_Level:2",
"Metric_Low_Threshold_Level:2",
"FM_Set_RSSI:1:",
]],

"CAC_FM_Get_AF_RSSI_Threshold" => [["3F", "0280",   ####New for CAC
"Get_RSSI_Threshold:1:64"],[
"Status:1",
"Get_RSSI_Threshold:1",
"AF_Threshold:2",
"Metric_Low_Threshold_:2",
"FM_Get_RSSI_Threshold:1",
]],

"CAC_FM_Set_FM_Band" => [["3F", "0280",
"Set_FM_Band:1:13",
"Upper_Limit:4",
"Lower_Limit:4",
"Step_Size:1",
"First_Good_Channel:4"],[
"Status:1",
"Set_FM_Band:1",		
"FM_Set_FM_Band:1",
]],

"CAC_FM_Channel_Up_Down" => [["3F", "0280",   ##New in CAC, FM_Channel_Up and FM_Channel_Down has been replaced by single API, FM_Channel_Up_Down
"Channel_Up_Down:1:37",
"Direction:1"],[
"Status:1",
"Channel_Up_Down:1",
"FM_Channel_UpDown:1",
"Channel_Frequency:4",
]],

"FM_Search_Full_Band" => [["3F", "0280",   ##New in CAC
"Scan_Full_Band:1:38"],[
"Status:1",
"Scan_Full_Band:1",
"FM_Scan_Full_Band:1",
"Channel_Freq:4",
]],

"CAC_FM_Get_Next" => [["3F", "0280",   ##New in CAC
"Direction:1:39"],[
"Status:1",
"Direction:1",
"FM_Direction:1",
"Channel_Freq:4",
"Realigned_Freq:1",
]],

"CAC_FM_Set_Audio_Deemphasis" => [["3F", "0280",
"Set_Deemphasis:1:0F",
"Deemphasis:1"],[
"Status:1",
"Set_Deemphasis:1",
"FM_Set_Audio_Deemphasis:1",
]],

"CAC_FM_Set_Audio_Volume" => [["3F", "0280",
"Set_Volume:1:65",
"Volume:2"],[
"Status:1",
"Set_Volume:1",
"FM_Set_Audio_Volume:1",
]],

"CAC_FM_Get_Audio_Volume" => [["3F", "0280",
"Get_Volume:1:66"],[
"Status:1",
"Get_Volume:1",
"FM_Get_Audio_Volume:1",
"FM_Volume:2",
]],

"CAC_FM_Enable_Soft_Mute" => [["3F", "0280",  ##Adding slope attenuation in earlier commands
"Enable_Soft_Mute:1:61",
"Enable:1",
"Mute_Threshold:2",
"Audio_Attenuation:2",
"Slop:1"],[
"Status:1",
"Enable_Soft_Mute:1",
"FM_Enable_Soft_Mute:1"
]],

"CAC_FM_Get_Soft_Mute_Status" => [["3F", "0280",
"Enable_Soft_Mute:1:62"],[
"Status:1",
"Enable_Soft_Mute:1",
"FM_Get_Soft_Mute_Mode:1",
"FM_Soft_Mute_Status:1",
]],

"CAC_FM_LNA_Capa_Tuning" => [["3F", "0280",    ###New for CAC
"LNA_Capa_Tunning:1:67",
"Mode:1",
"Offset:1",
"High_Gain:1",
"Low_Gain:1"],[
"Status:1",
"LNA_Capa_Tunning:1",
"LNA_Capa_Tunning:1",
]],

"CAC_FM_Disable_RDS_Processing" => [["3F", "0280",     ###New for CAC
"Disable_RDS_Processing:1:68"],[
"Status:1",
"Disable_RDS_Processing:1",
"FM_Disable_RDS_Processing:1",
]],

"CAC_FM_Set_Sampling_Rate_Shiftng" => [["3F", "0280",     ###New for CAC
"Set_Sampling_Rate_Shiftng:1:73",
"Shift_Value:1",
"Direction:1"],[
"Status:1",
"Set_Sampling_Rate_Shiftng:1",
"FM_Set_Sampling_Rate_Shiftng:1",
]],

"CAC_FM_Disbale_I2S_Clk" => [["3F", "0280",     ###New for CAC
"Disbale_I2S_Clk:1:74",
"Disable_Clk:1"],[
"Status:1",
"Disbale_I2S_Clk:1",
"FM_Disbale_I2S_Clk:1",
]],

"CAC_FM_Set_Volume_Ramps" => [["3F", "0280",     ###New for CAC
"Set_Volume_Ramps:1:75",
"Enable_Ramps:1",
"Step_Duration:1"],[
"Status:1",
"Set_Volume_Ramps:1",
"FM_Set_Volume_Ramps:1",
]],

"CAC_FM_Audio_Handshake_Ack" => [["3F", "0280",     ###New for CAC
"Audio_Handshake_Ack:1:76"],[
"Status:1",
"Audio_Handshake_Ack:1",
"FM_Audio_Handshake_Ack:1"
]],

"CAC_FM_Enable_Audio_Equilizer" => [["3F", "0280",     ###New for CAC
"Enable_Audio_Equilizer:1:77",
"Mode:1",
"Step_Size:1",
"Step_Duration:1"],[
"Status:1",
"Enable_Audio_Equilizer:1",
"FM_Enable_Audio_Equilizer:1",
]],

"CAC_FM_Set_Audio_Equilizer_Config" => [["3F", "0280",     ###New for CAC
"Set_Audio_Equilizer_Config:1:79",
"Coeff_Band_0:1",
"Coeff_Band_1:1",
"Coeff_Band_2:1",
"Channel_Quality:2"],[
"Status:1",
"Set_Audio_Equilizer_Config:1",
"FM_Audio_Equilizer_Config:1",
]],

"CAC_FM_Set_Local_Time" => [["3F", "0280",     ###New for CAC
"Set_Local_Time:1:95",
"Calibration_Time:2",
"Default_Value:1"],[
"Status:1",
"Set_Local_Time:1",
"FM_Set_Local_Time:1",
]],

"CAC_FM_Set_Antenna_Noise_Config" => [["3F", "0280",     ###New for CAC
"Set_Antenna_Noise_Config:1:97",
"Channel_Freq:4",
"FM_Metric:2",
"Reset_Array:1"],[
"Status:1",
"Set_Antenna_Noise_Config:1",
"FM_Set_Antenna_Noise_Config:1",
]],

"CAC_FM_Register_Read_Write" => [["3F", "0280",     ###New for CAC
"Register_Read_Write:1:9C",
"Read_Write:1",
"Offset:1",
"Value:1"],[
"Status:1",
"Register_Read_Write:1",
"FM_Register_Read_Write:1",
"Reg_Value:2",
"Register_Read_Write:1",
]],

"CAC_FM_RDS_Reset_Statistics" => [["3F", "0280",     ###New for CAC
"RDS_Reset_Statistics:1:9D",
"Period_Counter_Limit:4"],[
"Status:1",
"RDS_Reset_Statistics:1",
"FM_RDS_Reset_Statistics:1",
]],

"CAC_FM_RDS_Get_Statistic" => [["3F", "0280",     ###New for CAC
"RDS_Get_Statistic:1:9E"],[
"Status:1",
"RDS_Get_Statistic:1",
"FM_RDS_Get_Statistic:1".
"Num_Good_Blk:2",
"Num_Not_Sync_Blk:2",
"Expected_Blk:2",
"Success_Rate:1",
"RDS_Get_Statistic:1",
]],

"CAC_FM_Power_Down" => [["3F", "0280",     ###New for CAC
"Power_Down:1:9F"],[
"Status:1",
"Power_Down:1",
"FM_Power_Down:1",
]],

"CAC_FM_Debug" => [["3F", "0280",     ###New for CAC
"Debug:A0"],[
"Status:1",
"Debug:1",
"FM_Debug:1",
]],

"CAC_FM_Set_Mute_Mode" => [["3F", "0280",
"Set_Mute_Mode:1:15",
"Mute:1"],[
"Status:1",
"Set_Mute_Mode:1",
"FM_Set_Mute_Mode:1",
]],

"CAC_FM_Get_Mute_Mode" => [["3F", "0280",
"Get_Mute_Mode:1:16"],[
"Status:1",
"Get_Mute_Mode:1",
"FM_Get_Mute_Mode:1",
"FM_Current_Mute_Mode:1",
"Get_Mute_Mode:1:",
]],

"CAC_FM_Set_Audio_Path" => [["3F", "0280",
"Set_Audio_Path:1:1A",
"Audio_Path:1",
"I2S_Opernation:1",
"I2S_Mode:1"],[
"Status:1",
"Set_Audio_Path:1",
"FM_Set_Audio_Path:1",
]],

"CAC_FM_Get_Audio_Path" => [["3F", "0280",
"Get_Audio_Path:1:1B"],[
"Status:1",
"Get_Audio_Path:1",
"FM_Get_Audio_Path:1",
"FM_Audio_Path:1",
]],

"CAC_FM_Set_Audio_Sampling_Rate" => [["3F", "0280",
"Set_Audio_Sampling_Rate:1:3F",
"Sampling_Rate:1",
"BLCK-LRCLK_Division_Factor:1"],[
"Status:1",
"Set_Audio_Sampling_Rate:1",
"FM_Set_Audio_Sampling_Rate:1",
]],

"CAC_FM_Get_RDS_Data" => [["3F", "0280",
"Get_RDS_Data:1:20"],[
"Status:1",
"Get_RDS_Data:1",
"FM_RDS_Data:1",
]],

"CAC_FM_RDS_Flush" => [["3F", "0280",
"Flush_RDS_Data:1:21"],[
"Status:1",
"Flush_RDS_Data:1",
"FM_Flush_RDS_Data:1",
]],

"CAC_FM_Set_RDS_Memory_Depth" => [["3F", "0280",
"Set_Memory_Depth:1:22",
"Memory_Depth:1"],[
"Status:1",
"Set_Memory_Depth:1",
"FM_Set_RDS_Memory_Depth:1",
]],

"CAC_FM_Get_RDS_Memory_Depth" => [["3F", "0280",
"Get_Memory_Depth:1:23"],[
"Status:1",
"Get_Memory_Depth:1",
"FM_Get_Memory_Depth:1",
"FM_RDS_Memory_Depth:1",
]],

"CAC_FM_Set_RDS_PI_Code" => [["3F", "0280",
"Set_PI_Code:1:28",
"PI_Code:2"],[
"Status:1",
"Set_PI_Code:1",
"FM_Set_RDS_PI_Code:1",
]],

"CAC_FM_Get_RDS_PI_Code" => [["3F", "0280",
"Get_PI_Code:1:29"],[
"Status:1",
"Get_PI_Code:1",
"FM_Get_RDS_PI_Code:1",
"FM_Current_RDS_PI_Code:2",
]],

"CAC_FM_Set_RDS_PI_Code_Mask" => [["3F", "0280",
"Set_PI_Code_Mask:1:2A",
"PI_Code_Mask:2"],[
"Status:1",
"Set_PI_Code_Mask:1",
"FM_Set_RDS_PI_Code_Mask:1",
]],

"CAC_FM_Get_RDS_PI_Code_Mask" => [["3F", "0280",
"Get_PI_Code_Mask:1:2B"],[
"Status:1",
"Get_PI_Code_Mask:1",
"FM_Get_RDS_PI_Code_Mask:1",
"FM_Current_RDS_PI_Code_Mask:2",
]],

"CAC_FM_Set_RBDS_WO_E_Blocks" => [["3F", "0280",
"Set_RBDS_Without_E_Blocks:1:2C",
"RBDS_Without_E_Blocks:1"],[ 
"Status:1",
"Set_RBDS_Without_E_Blocks:1",
"FM_Set_RBDS_Without_E_Blocks:1",
]],

"CAC_FM_Get_RBDS_WO_E_Blocks" => [["3F", "0280",
"Get_RBDS_Without_E_Blocks:1:2D"],[ 
"Status:1",
"Get_RBDS_Without_E_Blocks:1",
"FM_Get_RBDS_WO_E_Blocks:1",
"FM_Current_RBDS_Without_E_Blocks:1",
]],

"CAC_FM_Reset_RDS_Stat"=> [["3F", "0280",
"RDS_Status_Reset:1:9D",
"Period_Counter_Limit:4"],[
"Status:1",
"RDS_Status_Reset:1",
"FM_Reset_RDS_Status:1",
]],

"CAC_FM_Get_RDS_Stat"=> [["3F", "0280",
"Get_RDS_Status:1:9E"],[
"Status:1",
"FM_Get_RDS_Status:1",
"FM_Get_Tx_RDS_Status:1",
"FM_Number_Of_Good_Blocks:2",
"FM_Number_of_Not_Synchronized_Blocks:2",
"FM_Expected_Blocks:2",
"FM_Success_Rate:1",
]],
);
