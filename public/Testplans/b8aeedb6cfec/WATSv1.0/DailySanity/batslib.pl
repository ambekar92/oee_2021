#!c:\perl\bin\perl.exe
# 	© 2019 NXP Confidential. All rights reserved
# Bluetooth Test System Library File
# batslib.pl
# by Dharmesh Patel
#
# Ver 0.1 - 09/27 - DP - Initial Version
# Ver 0.2 - 08/23 - DP - Updates for Logs, Abort, other fixes
#         - 09/12 - DP - Fixed PTO, Logfile update with results
#         - 12/17 - HP - Fixed Receive Data, data printing in log file
#
###########################################################
###########################################################
#
# Test Script Modification:
# 1. 	Date : 04 Oct 12 - By: Sanketh Shetty
#	Reason: Added timout values for Wait for events. 
#       16/10/12 - Mahehs Nahar - To modify Get_Event API to get more than one events.
#	02/11/2012 - Sanketh Shetty - Added API "GetTimeDifference" to return time difference and time required for ACL link
#	11/12/2012 - Sanketh Shetty - Modified API "GetTimeDifference" to return time difference along with decimal values.
#       12/12/2012 - Mahesh Nahar - Modified API to get firmware version of build
#	12/27/2012 - Harshad - Fixed Look_For and Receive_Data API's.
#	01/10/2013 - Harshad - Fix added in Find_Cmd for FM 
#       25/01/2013 - Mahesh(on behalf of Sathish) - NXPtool API changed
#      19/03/2013 - Mahesh- In LE_CleanUp API, check has been added to check whether dut supports BLE or not.
#      07/04/2013 - Mahesh  - Changes from Dharmesh for FMAPP to work on Robin2
#      07/04/2013 - Mahesh - Chnages done in Get_Event_API and Find_String API to change file handle to FM log file when if FMAPP is present.
#      25/06/2013 - Harshad - NFC char driver support added (mnfcchar0)
###########################################################
use IO::Handle;
use threads;
use threads::shared;
use Switch;
use Math::BigInt;
use Math::BigFloat; # ':constant'
#use Time::Piece;
#use Time::Seconds;
use Time::HiRes qw(gettimeofday tv_interval);
use IPC::System::Simple qw(capture);

#use Win32;
our $REG = 0;
our $Chip_Name;
our $FW_Ver;
our $LINUX = 0;
our $DEBUG = 1;
our $DPD = 1;
our $CONFIG = 'bats.conf';
our %DEVICE:shared;
our %LINK:shared;    # Link Array
our $TEST_NAME :shared;
our $TEMP;
our $LOG :shared;
our $BPATH;   # Bluetooth Linux Driver
our $HTOOL =  0; # HCITool else btd
our $HCITOOL = "hcitool -i ";
our $HCICONF = "hciconfig";
our $HCILOG = "hcidump -i ";
our $HCIRESET = 1;
our $FMPATH = "./fmapp_qa";
our $FMAPP = 0;
our $FMLOG = "fm.log";
our $FMDEV = "/dev/mfmchar0";
our $PAGE_ATTEMPTS = 2;
our $TFILE = "tres.tmp";
our $TEST_RES;
our $LOG_COMMENT;   # comment for logs on overall test
our $NFCLOG;
our @ReturnVersion;
my $BleTest = 0;
our $Wrong_COD_script_log;

my $RemoteDeviceFlag = 0;	
my %RemoteDevices;			
my @RemoteInterface;
my @LocalInterface;
our %ClientSockets; 		
our $TimeOutFlag : shared;
our $SecondaryHost;
our $TmpDevSocket;
our $TestSock;
our $HostIp;
$| = 1;

#NFC Test related parameters
our @array_p2p_data;
our @array_p2p_data_1;
our $p2p_received_data;
our $p2p_initiator_data;
our $lastCmd;
our $tag1Address;
our $tag3Address;
our $initline;
our $previousline;
our $nextlineval;
our $tagtype;
our $flagtype1 =0;
our $readdata;
our $flagtype2 =0;
our $flagtype3 =0;
our $flagcmd = 0;
our $type3emucycle = 0;
our $tag_deactivate = "false";
our $data_complete = "false";
our $Get_param_Id; # To capture Get parameter Ids
our $type1_mem_type; # To capture Type1 
our $data_to_read;# NDEF message to read
our $expected_data; # Expected data to read from Tag
our $read_complete_flag; # Flag to determine read data is complete.
our $noOfBlocktoReadT3; # No of blocks can be read in Type3 tag
our $noOfBlockNDEFT3; # No of blocks NDEF data can hold for Type 3 tag
our $Type2Tagmemsize; # memory size supported by the Type2 Tag
our $Type4MsgExecCount =0; # count of successful message execution.
our $Type4memory;
our $Type4FileIdentifier; 
our $Type4WriteAccess;
our $Type4ReadAccess;
our $Type4NLEN;
our $Type4lastcmd = 0; # the Last read command for Type4 reading
our $generic_detect; # The detection of tag is generic not for a particular technology
our $P2P1_Data_flag; # This flag is set to imply that P2PI is ready to send next data.
our $NegTest = "false";
our $countEmu = 0; # count emulation field on/off
our $countP2P = 0; # count P2P field on/off
our $Emulation_Pipe; # Pipe used for emulation saved in global variable to pass
our $P2P_Data_complete= 0; #P2P data transfer complete.
our $ongoingTest; # P2P test ongoing or not?
our $P2PI_pipe; # Pipe used for P2P saved in global variable to pass
our $noOfBytesWritten =0;
our $DatatoWriteinTag =0;
our $data_to_read_tag1;
our $data_to_read_tag2;
our $data_to_read_tag3;
our $data_to_read_tag4;
#our $warning; # warning message to store for extra command in write operation

$SIG{'INT'}    = \&Script_Exit;

our $is_pagetimeout=0;
our $num_dev;
our $exec_time :shared = undef;
our $stop_test :shared=1;
our $F_FILE = "prod.tmp";


my $PriSocket;
my $SecSocket;
my $HostAddr;
my $ScoHandle;
my $ScoApp = 'Mrvl_Tool/ScoApp';

our $nfc_dev;
my $TNFCCONF = "libnfc-brcm.conf";
my $NPATH = "./nfcd";
our $NFC;
my $CurrentPath = qx|pwd|;
################################ Configuration section ########################
if ($HTOOL)
{
   $BPATH   = 'hcitool ';    # Location of BT Driver
   $TEMP    = 't.log';
   $LOG     = 'logs/';
   $WLAN_LOG     = 'wlan_logs/';
} else
{
   $BPATH   = './btd';       # Location of BT Driver
   $TEMP    = 't.log';
   $LOG     = 'logs/';
   $WLAN_LOG     = 'wlan_logs/';
}

# Check if Log dir exist - if not create one 
unless(-d $LOG){
    mkdir $LOG or die "Can't create log dir $LOG $!";
}
#unless(-d $WLAN_LOG){
#    mkdir $LOG or die "Can't create log dir $LOG $!";
#}
########################### Function definations ##############################

# Debug print function
sub dprint {
   if ($DEBUG) {
      print " @_";
   }
} 
###############################################################################
# Exit script from BT_REG when "Ctrl C" is pressed
sub Script_Exit {

   $SIG{'PIPE'} = 'IGNORE';
   print "\n\nACK! Script Exit!\n Shutting Everything Down...\n";
   #&monitor_result('abort_script');

   exit 4;
}
###############################################################################

sub Open_Interface { # <$dev> <$interface>, <$cspeed> 
   my($logfile);
   my($bd);
   my ($fm_logfile);
   &Clean_UP_TLOG();
   $logfile = $LOG . $TEST_NAME . "_" . $_[0] . ".log";  # need to do something about $TEST
   if($_[3]) {
	$fm_logfile = $LOG . $TEST_NAME . "_" . $_[0] . "_" . "fm" .".log";  # need to do something about $TEST
   }
   if ($_[0] =~ m/dut/i)
   {
		$Wrong_COD_script_log = $logfile;
	}
   &dprint("Attempting connection to port $PORT...$_[0] at $_[1]\n");
   &StartBT($_[0], $_[1], $_[2], $_[3], $_[4]);
   &Open_Reading_Log($_[0], $_[1], $logfile);
   if ($_[3]) {
   	&Open_Reading_FM_Log($_[0], $_[1], $fm_logfile);
   }
   &Initialization($_[0]);
}
###############################################################################

sub Close_Interface { # <$dev>
	my($handle);
	my($fhandle);
	$PORT = $_[0];
	
	$handle = "Q_" . $PORT;
	$fhandle = "L_" . $PORT;
	
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~quit";
		if ($TmpSock) {
			print  $TmpSock "$data\n";
		}
	} else {
	   print $handle "quit\n";
	}
	
	&dprint("Closing down port... \n");
	close $handle;
	close $fhandle;
}
###############################################################################

sub StartBT # <$port>, <$speed>
{
   my ($handle);
   my($oldfilehandle);
   my ($btd_port) = $_[1];
   my $fm_port=0;
   my $nfc_port=0;
   my $speed = $_[2];
 
   $btd_port =~ s/hci//;
   $btd_port++;  # btd port starts at 1 for hci0
   if($_[3]) { # FM interface
   	$fm_port = $_[3];
	$fm_port =~ s/mfmchar//;
	$fm_port++;  # fm port starts at 1 for mfmchar0
	$FMAPP = 1;
   }
  if($_[4]) {  # NFC interface
   	$nfc_port = $_[4];
	$nfc_port =~ s/mnfcchar//;
	$nfc_port++;  # fm port starts at 1 for mfmchar0
   }

   $handle = "Q_" . $_[0];
   if ($HTOOL){
      # no need to open any interface here     
   }
   else {
		&dprint("$handle ", "| $BPATH -c $btd_port -f $fm_port -n $nfc_port -s $_[2] > /dev/null \n");
      		open($handle, "| $BPATH -c $btd_port -f $fm_port -n $nfc_port -s $_[2]") || die "Unable to open connection to BT OR FM Driver OR NFC Driver: $!\n";
      		$handle->autoflush(1);
	   	sleep 1;

	}
}
###############################################################################

sub Open_Reading_Log { # <$dev> <$port> <$logfile>
   my($logfile);
   my($handle);
   my($fhandle);
   my($retry) = $_[3]; # 3 retry, exit if fail
   
   $handle = "Q_" . $_[0];
   $fhandle = "L_" . $_[0];
   $logfile = $_[2];
   &StartLog($_[0], $_[1], $logfile);
   if ((!open($fhandle, $logfile)) && ($retry < 3)) {
      $retry++;
      &dprint("Logfile $logfile failed to open, retrying...\n");
      &Open_Reading_Log($_[0], $_[1], $_[2], $retry);
   }
   if ($retry > 1) {
      &dprint("System seems to be DEAD !!! - shutting down\n");
      &monitor_result('system_dead');
   }
   &dprint("-->$fhandle log - $logfile\n");
}
##############################################################################
sub Open_Reading_FM_Log { # <$dev> <$port> <$logfile>
   my($logfile);
   my($handle);
   my($fhandle);
   my($retry) = $_[3]; # 3 retry, exit if fail
   
   $handle = "Q_" . $_[0];
   $fhandle = "F_" . $_[0];
   $logfile = $_[2];
   &Start_FM_Log($_[0], $_[1], $logfile);
   if ((!open($fhandle, $logfile)) && ($retry < 3)) {
      $retry++;
      &dprint("Logfile $logfile failed to open, retrying...\n");
      &Open_Reading_FM_Log($_[0], $_[1], $_[2], $retry);
   }
   if ($retry > 1) {
      &dprint("System seems to be DEAD !!! - shutting down\n");
      &monitor_result('system_dead');
   }
   &dprint("-->$fhandle log - $logfile\n");
}
##############################################################################
sub Start_FM_Log {   # <$dev> <$port> <$logfile>
   my($handle);
   my($logfile);
   my $cmd;
   my $port = $_[1];
   $handle = "Q_" . $_[0];
   $logfile = $_[2];
   if (-r $logfile) {
      if (!unlink($logfile)) {
         print "*FAILED*\nUnable to Clobber Old Logfile.\n";
         ## &CloseBcomm;
         print "\nPlease check the log name and try again.\n\n";
         exit(1);
      }
   }
   select(undef,undef,undef,1);
   &dprint("--> $handle fmlog $logfile\n");
   print $handle "fmlog $logfile\n";
   #$cmd = "$HCILOG" . $port . " -tR > $logfile &";
   #&dosystem($cmd);
  
   select(undef,undef,undef,1);   # Give time for file to be created before moving on.
}


###############################################################################
sub FM_Init {
   my $dev = "FM";
   if ($FMAPP) {
      my $cmd = "> $FMLOG";
      &dosystem($cmd);
      # &Open_Reading_Log($_[0], $_[1], $_[2], $retry);
   }
   
   if (!(-e $FMPATH)) 
   {
      print "\n#############################################\n";
      print "You don't have $FMPATH file for FM Testing \n";
      exit(1);
   } 

   
   $handle = "Q_" . $dev;
   $fhandle = "L_" . $dev;
   $logfile = $FMLOG;
   if (!open($fhandle, $logfile) ){
      &dprint("Logfile $logfile failed to open, quit...\n");
      &monitor_result('system_dead');
   }
   &dprint(  "FM Init completed !\n")
}
###############################################################################

sub StartLog {   # <$dev> <$port> <$logfile>
   my($handle);
   my($logfile);
   my $cmd;
   my $port = $_[1];
   $handle = "Q_" . $_[0];
   $logfile = $_[2];
   if (-r $logfile) {
      if (!unlink($logfile)) {
         print "*FAILED*\nUnable to Clobber Old Logfile.\n";
         ## &CloseBcomm;
         print "\nPlease check the log name and try again.\n\n";
         exit(1);
      }
   }
   select(undef,undef,undef,1);
   if ($HTOOL) {
      &dprint("--> hcidump reading log $logfile \n");
      $cmd = "$HCILOG" . $port . " -Rt > $logfile";
      &dosystem($cmd);
   }
   else
   {
      &dprint("--> $handle log $logfile\n");
      print $handle "log $logfile\n";
   
      #$cmd = "$HCILOG" . $port . " -tR > $logfile &";
      #&dosystem($cmd);
   }
   select(undef,undef,undef,1);   # Give time for file to be created before moving on.
}
###############################################################################

sub Open_Checking_Log { # <$dev> <$port> <$logfile>
   my($chandle);
   my($cfile);
   $cfile = $_[2];
   $chandle = "C_" . $_[0];
   open($chandle, $cfile) || die "ERROR: Couldn't open logfile: $!\n";
}

###############################################################################

sub ProdFirm {

	my $ProdFirmStr = "";

	if ($DEVICE{dut.manufacturer} eq "Marvell Technology Group Ltd.") {
           
       &Send_CMD(dut, Marvell_Read_Firmware_Revision);
	   @FW_Value = &Get_Event_Data(dut, Command_Complete_Event, Firmware_Version, 11);
	   $FW = $FW_Value[0];
	   $sub1 =hex(substr($FW, 0, 2));
	   $sub2 =hex(substr($FW, 2, 2));
	   $sub3 =hex(substr($FW, 4, 2));
	   $sub4 =hex(substr($FW, 6, 2));
	   $FW_Ver = "$sub2"."."."$sub3"."."."$sub4"."."."p"."$sub1";
	   
       &Send_CMD(dut, Read_Local_Version_Information);
@ReturnVersion = &Get_Event_Data(dut, Command_Complete_Event, Num_HCI_Command_Packets, Command_Opcode,Status, HCI_Version, HCI_Revision, LMP_Version, Manufacturer_Name, LMP_Subversion, 2);
       &chip_id(dut); 
       $ProdFirmStr =$DEVICE{'dut'."chipname"};
	   $ProdFirmStr .= "^".$FW_Ver; 
	   open (PH, "> $F_FILE") || print "ERROR opening $F_FILE... \n";
	   print PH $ProdFirmStr;
	   close (PH);
     }
}
###############################################################################
sub chip_id {

	if ($DEVICE{$_[0].manufacturer} eq "Marvell Technology Group Ltd.") {
	
	&Send_CMD($_[0], Marvell_Read_Memory, 0x80002018, 0x04);
	@ChipId = &Get_Event_Data($_[0], Command_Complete_Event, Register_Value, 4);
	
	if ($ChipId[0] eq '00000000') {
		&Send_CMD($_[0], Marvell_Read_Memory, 0x80002080, 0x04);
		@ChipId = &Get_Event_Data($_[0], Command_Complete_Event, Register_Value, 4);
	}
 
     $_sub1 = (substr($ChipId[0], 0, 1));
     $_sub2 = (substr($ChipId[0], 1, 1));
     $_sub3 = (substr($ChipId[0], 2, 1));
     $_sub4 = (substr($ChipId[0], 3, 1));
     $_sub5 = (substr($ChipId[0], 4, 1));
     $_sub6 = (substr($ChipId[0], 5, 1));

     if(($_sub1 eq '0')&($_sub2 eq '0')&($_sub3 eq'0')&($_sub4 eq'0')){ 
		 	$_sub7 = (substr($ChipId[0], 4, 2));
		  }
	 elsif(($_sub1 eq '0')&($_sub2 eq '0')&($_sub3 eq'0')){
		 $_sub7 = (substr($ChipId[0], 3, 2));
		  }		   
	 elsif(($_sub1 eq '0')&($_sub2 eq '0')){
		 $_sub7 = (substr($ChipId[0], 2, 2));
		  }	    
	 elsif(($_sub1 eq '0')&($_sub2 ne '0')){
		 $_sub7 = (substr($ChipId[0], 1, 2));
		  }
	 else{
		 $_sub7 = (substr($ChipId[0], 0, 2));
	   	  }	  	 
	   
      $DEVICE{$_[0]."chipname"} = $chip_id{"$_sub7"};	
	}
    
 }	
###############################################################################
sub Load_NFC
{
	my $logfile;
	my $handle;
	my $ConfFile;
	
	&Load_Conf_File();					#API to populate DEVICE DB
	
	$NFC = 1;
	$REG = &Check_REG_Running();  # checking if REG is running
	&dprint ("Opening NFC Port...\n");
	# kill existing process

	if (!$REG) {
		$TEST_NAME = $_[0] . "_" . time();
	} else {
		$TEST_NAME = $ENV{"_T_TEST"};
		$TEST_NAME =~ s/\s*//g;
	}

	&Clean_UP_TLOG();	
	if(!(-e $TFILE)) {
		system("touch $TFILE");
	}
	
	&dprint("Attempting connection NFC App\n");
	for ( my $iter=0; $iter < $nfc_dev; $iter++ ) {
		if ($iter == 0) {
			$ConfFile = &Create_nfcd_Conf("ndut");
			&Open_NFC_Interface("ndut", $ConfFile, $TEST_NAME);
		} else {
			$ConfFile = &Create_nfcd_Conf("nref$iter");
			&Open_NFC_Interface("nref$iter", $ConfFile, $TEST_NAME);
		}
	}
}
###############################################################################
sub Open_NFC_Interface { 	#Subroutine to attach nfcd tool to desired device.
	
	my $DEV = $_[0];
	my $nfcConf = $_[1];
	my $TestName = $_[2];
	my $logfile;
	my $handle;
	my($oldfilehandle);
	
	
	$logfile = $LOG . $TestName . "_NFC_" . $DEV .".log";
	
	$handle = "Q_".$DEV;
	&dprint("$handle ", "| $NPATH --conf $nfcConf > $logfile\n");
	open($handle, "| $NPATH --conf $nfcConf") || die "Unable to open connection to NFC Driver: $!\n";
#	$oldfilehandle = select($handle);
#	$| = 1;
#	select ($oldfilehandle);
#	$| = 1;
	$handle->autoflush(1);
	print $handle "stack brcm;\n";
	sleep 1;
	
	&StartLogNFC($DEV, $logfile);
	select(undef, undef, undef, 0.5);
	
	print $handle "init;\n";
	sleep 4;

	&Send_NFC($DEV, "get version;");
	&NFC_Wait($DEV,"Marvell", 3);
	&dprint("$DEV: NFC App up running\n");
}

###############################################################################
sub StartLogNFC {		#<dev> <logfile>
	
	my $handle;
	my $DEV = $_[0];
	my $logfile = $_[1];
	my $fhandle;
	
	$handle = "Q_".$DEV;
	$fhandle = "L_".$DEV;
	
	if (-r $logfile) {
		if (!unlink($logfile)) {
			print "*FAILED*\nUnable to Clobber Old Logfile.\n";
			print "\nPlease check the log name and try again.\n\n";
			exit(1);
		}
	}

	select(undef, undef, undef, 0.5);

	print $handle "tracing file $logfile;\n";
	&Open_NFC_Log($DEV, $logfile);
	&dprint("-->$fhandle log - $logfile\n");
}

###############################################################################
sub Create_nfcd_Conf {		#Subroutine to create configuration file for each interface
	
	my $DEV = $_[0];
	my $nfcConf = $TNFCCONF;
	my $_TmpConf = "lib_nfcd.conf";
	my $_TmpLine;
	my $_TmpIntf;
	my $_TmpPort;
	
	if (!-e $nfcConf) {
		&monitor_result('error', "$nfcConf file is required to configure NFC tool....");
	}
	open (nFHR, $nfcConf) || die "Unable to open $nfcConf: $!";
	open (nFHW, ">$_TmpConf") || die "Unable to open $_TmpConf: $!";
	
	while ($_TmpLine = <nFHR> ) {
		chomp $_TmpLine;
		$_TmpLine =~ s/^\s+//;
		if ($_TmpLine =~ m/^TRANSPORT_DRIVER=/) {
			$_TmpIntf = $DEVICE{$DEV."intf"};
			$_TmpPort = $_TmpIntf;
			$_TmpIntf =~ s/\d+$//;
			$_TmpPort =~ s/$_TmpIntf//;
			print nFHW "TRANSPORT_DRIVER=\"$_TmpIntf\"\n";
		} elsif ($_TmpLine =~ m/^UART_PORT=/) {
			if ( $_TmpPort eq '' ) {
				$_TmpPort = 0;
			}
			print nFHW "UART_PORT=$_TmpPort\n";
		} else {
			print nFHW "$_TmpLine\n";
		}
	}
	close nFHR;
	close nFHW;
	
	return $_TmpConf;
}

###############################################################################
sub UnLoad_NFC { #<dev>

    &Send_NFC($_[0], "stop;");
	select(undef, undef, undef, 0.5);
	
    &Send_NFC($_[0], "reset polling_techs;");
    &NFC_Wait($_[0], "OK", 5);

    &Send_NFC($_[0], "reset ce;");
    &NFC_Wait($_[0], "OK", 5);
   
    &Send_NFC($_[0], "exit;");
}
###############################################################################
sub Open_NFC_Log  { #<dev> <logfile>

	my $DEV = $_[0];
	my $fhandle = "L_".$DEV;
	my $logfile = $_[1];
	my $retry = $_[2] || 0;
	
	select(undef, undef, undef, 0.5);
	if ((!open($fhandle, $logfile)) && ($retry < 3)) {
		$retry += 1;
		&dprint("Logfile $logfile failed to open, retrying...$retry\n");
		&Open_NFC_Log($DEV, $logfile, $retry);
	}
	if ($retry > 3) {
		&dprint("System seems to be DEAD !!! - shutting down\n");
		&monitor_result('system_dead');
	}
}
###############################################################################
sub Close_NFC_Log # logfile
{
   my($fhandle);
   $fhandle = "L_NFC";
   $logfile = $_[0];
   close ($fhandle);
}
###############################################################################
sub Send_NFC { # <dev> <Command>

   my $nhandle = "Q_".$_[0];
   my $ncmd = $_[1];
   
   &Eat_NFC_Logs($_[0]);
   
   &dprint("CMD - $_[0] > $ncmd\n");
   print $nhandle "$ncmd\n";
}

###############################################################################
sub NFC_Config { # <dev> <Command> ...

    my $DEV = $_[0];
    my $polling_techs = $_[1];
    my @ce = split / /, $_[2];
    my $bitrates = $_[3]; # <bitrate type in order:
			  # >> NCI specs - Section 6 RF Comm Config
                          #  PI: PI_BIT_RATE (ISO-DEP)
			  #  LI: LI_BIT_RATE (Listen ISO-DEP)
                          #  PN: PN_NFC_DEP_SPEED (NFC-DEP)
                          #  PF: PF_BIT_RATE (Poll F)
			  #  LF: LF_CON_BITR_F (Listen F)
                          #  PV: PV_BIT_RATE (Poll V)
                          #  LV: LV_BIT_RATE (Listen V)

    my $param_164 = "\"$_[4]\"";
    my $param_163 = "\"$_[5]\"";
    my $p2pt = $_[6];
    my $nstring = $_[7];
    my $ndef_string = "\"$nstring\"";
    my $polling_techs_cmd;
    my $ce_cmd;

   if ($polling_techs eq "reset") {
      $polling_techs_cmd = "reset polling_techs;";
   } else {
      $polling_techs_cmd = "set polling_techs $polling_techs;";
   }
   &Send_NFC($DEV, $polling_techs_cmd);
   &NFC_Wait($DEV, "OK", 2);

   &Send_NFC($DEV, "reset ce;");
   &NFC_Wait($DEV, "OK", 2);
   if ( not "reset" ~~ @ce ) {
      $ce_cmd = "set ce $ce[0] $ndef_string $ce[1];";
      &Send_NFC($DEV, $ce_cmd);
      &NFC_Wait($DEV, "OK", 2);
   } 

   &Send_NFC($DEV, "set bitrates $bitrates;");
   &NFC_Wait($DEV, "OK", 2);

   &Send_NFC($DEV, "set param 164 $param_164;");
   &NFC_Wait($DEV, "OK", 2);
   &Send_NFC($DEV, "set param 163 $param_163;");
   &NFC_Wait($DEV, "OK", 2);

   &Send_NFC($DEV, "set p2pt $p2pt;");
   &NFC_Wait($DEV, "OK", 2);
}

###############################################################################
sub NFC_Dev_Activate { # <dev> <Command> .....

	my $DEV = $_[0];
    my $dev_type = $_[1];
    my $listen_mode;

    if ($dev_type =~ /(?i)P2P/)
    {
      $ttype = "NFC-DEP";
    } else
    { 
      $ttype = substr($dev_type,0,3);
    }

    if ($dev_type =~ /(?i)CE/ || $dev_type =~ /(?i)P2Pt/) 
    {
        $listen_mode = true;
    } else 
    {
        $listen_mode = false;
    }  

    if ($dev_type ~~ [qw( T1T T2T T4TA T1TCE T2TCE T4TACE P2PtAP P2PiAP )])# For ref Type1, Type2, Type4A Tag and UUT Type1, Type2, Type4A Card Emulation, P2P A_Passive, P2P A_Active
    {
        $rf_mode = A;

    } elsif ($dev_type ~~ [qw( T4TB T4TBCE )])# For ref Type4B Tag and UUT Type4B Card Emulation
    {
        $rf_mode = B;

    } elsif ($dev_type ~~ [qw( T3T T3TCE P2PtFP P2PiFP )])# For ref Type3 Tag and UUT Type3 Card Emulation, P2P F_Passive, P2P F_Active
    {
        $rf_mode = F;

    } elsif ($dev_type ~~ [qw( T5T T5TCE )])# For ref Type5 Tag and UUT Type5 Card Emulation
    {
        $rf_mode = V;

    } else
    {
       &dprint("Unexpected device type");
   #    exit(1);
    } 

   &dprint("\nrf_mode is $rf_mode\n");
    
   &Send_NFC($DEV, "start;");
   &NFC_Wait($DEV, "NFA_RF_DISCOVERY_STARTED_EVT: status = 0", 3);

    if ($dev_type =~ /(?i)CE/ || $dev_type =~ /(?i)P2Pt/) 
    {
	&NFC_Look_For($DEV, "event: activated ", 1);
    	&NFC_Look_For($DEV, "type: $ttype", 1);
    	&NFC_Look_For($DEV, "listen_mode: $listen_mode", 1);
    	&NFC_Look_For($DEV, "rf_mode: $rf_mode", 1);
    } else
    {
	&NFC_Wait($DEV, "event: activated ", 15);
    	&NFC_Wait($DEV, "type: $ttype", 1);
    	&NFC_Wait($DEV, "listen_mode: $listen_mode", 1);
    	&NFC_Wait($DEV, "rf_mode: $rf_mode", 1);
    	sleep 4;
    }
}
###############################################################################
sub NFC_Stop { #<dev> <Command>....

	my $DEV = $_[0];
	&Send_NFC($DEV, "stop;");
	&NFC_Wait($DEV, "POLL_DISABLED_EVT: status = 0", 5);
}
###############################################################################
sub NFC_Read  { # <dev> <Command>.....

	my $DEV = $_[0];
	my $ndef_string = $_[1];
	
	&Send_NFC($DEV, "read ndef;");
	&NFC_Wait($DEV, $ndef_string,8);
}
###############################################################################
sub NFC_Write { # <dev> <Command>........

	my $DEV = $_[0];
	my $nstring = $_[1];
	my $ndef_string = "\"$nstring\"";
	
	&Send_NFC($DEV, "write ndef $ndef_string;");
	&NFC_Wait($DEV, "OK", 5);
	&Send_NFC($DEV, "read ndef;");
	&NFC_Wait($DEV, $nstring, 3);
}
###############################################################################
sub NFC_Wait { #<dev> <String> <timeout>

	my $DEV = $_[0];
	my $fhandle = "L_".$DEV;
	my $nstring = $_[1];
	my $timeout = $_[2];
	my $line;
	my $linenum;
	my $result = 1; # 1=fail, 0=success
	my $exit = 1;
	
	#&dprint ("===== Checking log $file_handle\n");
	do {
		$line = <$fhandle>;
		$linenum = $.;
		if ($line =~ $nstring)
		{
			$exit = 0;
			$result = 0;
		}
		elsif ($line eq '')
		{
			$timeout--;
			#&dprint ("---- Timeout $timeout\n");
			select(undef, undef, undef, 1);
			if ($timeout == 0) {
				&monitor_result('nfc_timeout', "Timeout For Event $nstring");
				$exit=0;
			}
		} else
		{
		#&dprint ("====d $line\n");
		# go to next line
		}
	} while $exit;
	chomp $line;
	&dprint ("$line\n");
	&dprint ("==== Found String = $nstring\n");
	return $result;
}

###############################################################################
sub NFC_Look_For { #<dev> <String> <timeout>

        my $DEV = $_[0];
        my $fhandle = "L_".$DEV;
        my $nstring = $_[1];
        my $timeout = $_[2];
        my $line;
        my $linenum;
        my $result = 1; # 1=fail, 0=success
        my $exit = 1;

        #&dprint ("===== Checking log $file_handle\n");
        do {
                $line = <$fhandle>;
                $linenum = $.;
                if ($line =~ $nstring)
                {
                        $exit = 0;
                        $result = 0;
                }
                elsif ($line eq '')
                {
                        $timeout--;
                        #&dprint ("---- Timeout $timeout\n");
                        select(undef, undef, undef, 1);
                         if ($timeout == 0) {
               #                 &monitor_result('nfc_timeout', "Timeout For Event $nstring");
                                $exit=0;
                        }
                } else
                {
                #&dprint ("====d $line\n");
                # go to next line
                }
        } while $exit;
        chomp $line;
        &dprint ("$line\n");
        &dprint ("==== Found String = $nstring\n");
        return $result;
}


###############################################################################

sub Eat_NFC_Logs { # <dev>

   my $fhandle = "L_".$_[0];
   while (<$fhandle>) {;}
}
###############################################################################

sub Load_Interface 
{
	print "=======================Opening BT Ports...\n";
    my $ports_to_open = "";
    my @ports = ();
	my $RemoteIp;
    
    $REG = &Check_REG_Running();  # checking if REG is running

    print "Opening BT Ports...\n";
	# Temp - will need to clean up later
	#system("killall -9 hcidump\n");
    system("killall -9 hcitool\n");
	# Need to recode this to really check device precense DPD
	# &Check_Devices; 
	&Load_Conf_File();
	######Starting a thread to control the execution time of the script##########
	if ($exec_time != undef) {
      $thr= threads->create(\&stop_test);
      $thr->detach();
	}   
	if (!$SecondaryHost) { 
		if (!$REG) {
			$TEST_NAME = $_[0] . time();
			$LOG = $LOG.$TEST_NAME.'/';

			$kernelVer = qx|uname -r|;
			if (! -e "btd" ) {
				if ( uc($kernelVer) =~ m/FC13/ ) {
					system("cp -rf btd_FC13 btd");
				} elsif (uc($kernelVer) =~ m/FC18/) {
					system("cp -rf btd_FC18 btd");
				}
			}
			if (! -e "Mrvl_Tool" ) {
				if ( uc($kernelVer) =~ m/FC13/ ) {
					system("cp -rf Mrvl_Tool_FC13 Mrvl_Tool");
				} elsif (uc($kernelVer) =~ m/FC18/) {
					system("cp -rf Mrvl_Tool_FC18 Mrvl_Tool");
				}
			}
			system("ls | grep -v logs | xargs chmod -R +x");
	    } else {
			$TEST_NAME = $ENV{"_T_TEST"};
		  	$TEST_NAME =~ s/\s*//g;
		  	$LOG = $ENV{"_LOG_PATH"} || $LOG;
		  	$LOG =~ s/\/$//;
		  	$_Folder = $ENV{"_TEST_ID"} || $ENV{"_T_TEST"};
		  	$LOG = $LOG.'/'.$_Folder.'/';
		}
	}
	
	system("mkdir -p $LOG");
	if(!(-e $TFILE)) {
       system("> $TFILE");
    }

	print "-- \$SecondaryHost: $SecondaryHost\n";
	# This block of code attaches btd instances to respective interfaces.
	# $SecondaryHost --> is an control variable which differentiates batslib instance between primary and secondary host.
	#					$SecondaryHost = 1, indicates the batslib instance is running on secondary host.
	#					This variable is set in 'RemoteDevControl.pl' file.
	# In batslib if $SecondaryHost is evaluated to true then commands are been executed in remote machine.
	# In case of below code snippet. if is evaluated truw then all the devices on remote machine is intialized locally. and in case of false then loacl devices are intialized.
	if ($SecondaryHost) {
		$RemoteDeviceFlag = 0;
        for (my $i=0; $i<=($num_dev-1); $i++) {
            if (($i==0) && ( 'dut' ~~ @LocalInterface)) {
                &Open_Interface("dut", $DEVICE{"dut"."port"},$DEVICE{"dut"."spd"},$DEVICE{"dut"."fm"},$DEVICE{"dut"."nfc"});
            }elsif ("ref$i" ~~ @LocalInterface) {
                &Open_Interface("ref$i", $DEVICE{"ref$i"."port"},$DEVICE{"ref$i"."spd"});
                &chip_id("ref$i");
            }
        }
	} else {
		for (my $i=0; $i<=($num_dev-1); $i++) {
			if (($i==0) && !( 'dut' ~~ @RemoteInterface)) {
				&Open_Interface("dut", $DEVICE{"dut"."port"},115200,$DEVICE{"dut"."fm"},$DEVICE{"dut"."nfc"});
			} elsif ( !("ref$i" ~~ @RemoteInterface) ) {
				&Open_Interface("ref$i", $DEVICE{"ref$i"."port"},115200);
                        &chip_id("ref$i");

			}
		}
	}

    #} else {
    #    $TEST_NAME = $ENV{"_T_TEST"};
    #    $ports_to_open = $ENV{"_T_PORTS"};
    #    @ports = split(" ", $ports_to_open);
    #    &dprint(" xxxxx I am here - $ports_to_open\n");
    #    my $tport;
    #    foreach my $tport (@ports){
    #        &dprint(" xxxxx I am here - $tport\n");
    #        &dprint ("Opening port" . $tport . "" . $DEVICE{$tport."port"} . " " . $DEVICE{$tport."spd"});
    #        &Open_Interface($tport, $DEVICE{$tport."port"}, $DEVICE{$tport."spd"});
    #   }
    #}

	
	# $RemoteDeviceFlag indicates existance of remote machine.
	if ($RemoteDeviceFlag) {
		require('RemoteDeviceLib.pl');
		my @TmpArray = &GetIp();
		foreach $TmpKeys (sort keys %RemoteDevices) {
			$TmpKeys =~ s/\d+\.\d+$//;
			foreach my $TmpIp (@TmpArray) {
				if ($TmpIp =~ $TmpKeys) {
					$HostAddr = $TmpIp;
					last;
				}
				if ($HostAddr) {
					last;
				}
			}
		}
		
		# 'Config_Remote_Device' subroutine is defined in RemoteDevLib.pl file.
		# Params: Remote device hash, Number of devices used in the test, Test case name and Primary Host ip.
	   	foreach $RemoteIp (sort keys %RemoteDevices) {
			my $_TmpRemoteFlag = 0;
			my $_TmpDev;
			foreach my $RemoteDev (sort keys %{$RemoteDevices{$RemoteIp}}) {
				my $_TmpStr = $RemoteDevices{$RemoteIp}{$RemoteDev}{'dev'};
				$_TmpDev = $_TmpStr;
				$_TmpStr =~ s/ref//;
				if ( $_TmpStr < $num_dev || $_TmpStr =~ m/dut/i ) {
					$_TmpRemoteFlag = 1;
				}
			}
			if ($RemoteIp =~ m/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])/ && $_TmpRemoteFlag) {
				print "\nRemote > $_TmpDev : $RemoteIp\n";
				&Config_Remote_Device(\%RemoteDevices, $num_dev, $TEST_NAME, $HostAddr, $RemoteIp, $HTOOL);
				&Create_Server_Socket($RemoteIp);
				&Accept_Remote_Connection($RemoteIp);
			}
		}
		
		# 'Update_Init_DB': This subroutine is used to Initialize Device DB(%DEVICE) and Link DB(%LINK) between hosts.
		&Update_Init_DB();
		# 'Update_DB': This thread constanly sync's Device and Link DB between primary and secondary hosts.
		foreach $ip (keys %RemoteDevices) {
	   		$TmpThr = threads->create(\&Update_DB, $ip);
			$TmpThr->detach();
		}
		&mSleep(25);				# 25 milli second sleep.
		sleep 4;
	}
    # FIX ME need to remove this once REG works DPD
	&ProdFirm();
	#if (-e $FMDEV) {
		#  $FMAPP = 1;
		#  &FM_Init;

	#}
}
###############################################################################
sub Close_NFC_interface { #<dev> 
	
	my $DEV = $_[0];
	my $handle;
	my $fhandle;
	
	$handle = "Q_".$DEV;
	$fhandle = "L_".$DEV;
	
	&UnLoad_NFC($DEV);
	
	&dprint("Closing down $DEV port.....\n");
	close $handle;
	close $fhandle;
}

###############################################################################
sub UnLoad_Interface 
{
	#print "Closing BT Ports...\n";
	#&Load_Conf_File();
	
	for (my $i=0; $i<=($num_dev-1); $i++) {
		if ($i==0) {
			&Close_Interface("dut", $DEVICE{"dut"."port"},$DEVICE{"dut"."spd"});      
		} else {
			&Close_Interface("ref$i", $DEVICE{"ref$i"."port"},$DEVICE{"ref$i"."spd"});      
		}
	}
	if ( $RemoteDeviceFlag && !$SecondaryHost ) {
		foreach my $TmpDev (keys %ClientSockets) {
			if ( !($TmpDev =~ m/SYNC$/) ) {
				my $TmpSock = $ClientSockets{$TmpDev};
				print $TmpSock "QUIT\n";
			}
		}
	}
	
	if(!$HTOOL) {
		&log_gen;
	}
	
	if ($NFC) {
		for ( my $iter=0; $iter < $nfc_dev; $iter++ ) {
			if ($iter == 0) {
				&Close_NFC_interface("ndut");
			} else {
				&Close_NFC_interface("nref$iter");
			}
		}
	}
	# Temp - will need to clean up later
	system("killall -9 hcidump\n");
	system("killall -9 hcitool\n");
}

###############################################################################
# This subroutine is used to sync device DB on primary and Secondary host, at the end of Initialization of all the devices. i.e, after &open_interface(..) sub call

sub Update_Init_DB {
	my @DeviceArry;
	my $DeviceStr;
	my $flag = 'DEV';				# 'DEV' is the KEY word to identfy the data intended to %DEVICE DB.
	
	foreach $TmpSock (keys %ClientSockets) {
		if ( $TmpSock =~ m/SYNC$/ ) {
			foreach $TmpKey (keys %DEVICE) {
				if($TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
					$DeviceStr .= "$TmpKey:$DEVICE{$TmpKey}:";
				}
			}
			$TmpSock = $ClientSockets{$TmpSock};
			$DeviceStr .= $flag;
			print $TmpSock "$DeviceStr\n";
		}
	}
}

###############################################################################
# Following subroutine is used to return all the network interfaces used in the host.
sub GetIp {
	my @LanInterface;
	my @LanInterface = qx|ifconfig| or die("Cant get info on interfaces: ".$!);
	my @Interface;

	foreach(@LanInterface){
		if ($_ =~ m/eth/ ) {
			my @TmpArray = split(/\s+/, $_);
			@IpAddr = qx|ifconfig $TmpArray[0]| or die("Cant get info from ifconfig: ".$!);
			foreach (@IpAddr) {
				if ($_ =~ m/inet addr:/) {
        	    	$SysAddr=$_;
	            	$SysAddr =~ s/^\s*//;
	            	$SysAddr =~ s/inet addr://;
	            	$SysAddr =~ s/\s.*//;
		    		$SysAddr =~ s/\n$//;
					push(@IP,$SysAddr);
				}
			}
		}
	}
	return @IP;
}

###############################################################################
# This subroutine is used to read in coming data on the socket. 
# an timeout out is been implemented on the socket using 'Socket_Timer' thread.

sub readSock {
	my $InSock = $_[0];
	my $TmpData;

	my $thr = threads->create(\&Socket_Timer, $_[1]+2, $_[2], $_[3])->detach();
	$TmpData = <$InSock>;
	&mSleep(50);
	$TimeOutFlag = 0;
	return $TmpData;
}
###############################################################################
sub mSleep {	#<Time in milli Sec>

	my $TimeSec = $_[0];
	my $milliSec;

	$milliSec = $TimeSec/1000;
	select(undef, undef, undef, $milliSec);		#Sleep in millesec.
}
###############################################################################
# This subroutine is used to monitor socket for incoming data. If there is no data then theard timesout and control is passed to &monitor_result() subroutine with timeout param.
sub Socket_Timer {

	my $TimeOut =  Math::BigFloat->new($_[0]);
	my $TimePart;

	my $tid = threads->tid();

	$TimePart = $TimeOut/100;
	$TimeOutFlag = 1;
	
	for ( my $iter=0; $iter < 100; $iter++ ) {
		select(undef,undef,undef, $TimePart);
		if (!$TimeOutFlag) {
			threads->exit();	
			return 1;
		}
	}
	if ($TimeOutFlag) {
		&dprint ("\n Thread: Timeout Occured for $_[1] on $_[2]");
        &monitor_result('timeout', "Timeout For Event $_[1] on $_[2]");
	}
}

#######################################################################################
# Following subroutine is used to create server socket.
sub Create_Server_Socket {
	# flush after every write
	$| = 1;
	my $RemoteIpAddr = $_[0];
	my $InterFace;
	my $portMain = 5000;
	my $portSync = 6000;
	
	foreach my $dev (keys %{$RemoteDevices{$RemoteIpAddr}}) {
		$InterFace = lc($RemoteDevices{$RemoteIpAddr}{$dev}{'dev'});
		$InterFace =~ s/ref//;
		$portMain += $InterFace;
		$portSync += $InterFace;
	}
	# creating object interface of IO::Socket::INET modules which internally does
	# socket creation, binding and listening at the specified port address.
	$PriSocket = new IO::Socket::INET (
		LocalHost => $HostAddr,
		LocalPort => $portMain,
		Proto => 'tcp',
		Listen => 5,
		Reuse => 1
	) or die "ERROR in Socket Creation : $!\n";
	
	$SecSocket = new IO::Socket::INET (
		LocalHost => $HostAddr,
		LocalPort => $portSync,
		Proto => 'tcp',
		Listen => 5,
		Reuse => 1
	) or die "ERROR in Socket Creation : $!\n";
}
#######################################################################################
# Following subroutine is used to accept in coming connections from secondary host.
# %ClientSockets DB is used to keep tarck of sockets created.
# $ClientSockets{$TmpRemote} --> port 5001 : is used to communicate all commands and responses between hosts.
# $ClientSockets{$TmpRemote."SYNC"} --> port 6001: is used to communicate %DEVICE and %LINK syncronization activities.
sub Accept_Remote_Connection {
	my %Tmp : shared;
	my $TmpRemote = $_[0];

	my $InterFace;
	my $portMain = 5000;
	my $portSync = 6000;
	
	foreach my $dev (keys %{$RemoteDevices{$TmpRemote}}) {
		$InterFace = lc($RemoteDevices{$TmpRemote}{$dev}{'dev'});
		$InterFace =~ s/ref//;
		$portMain += $InterFace;
		$portSync += $InterFace;
	}
	
	print "SERVER Waiting for client connection on port $portMain\n";
	$client_socket = $PriSocket->accept();

	$ClientSockets{$TmpRemote} = $client_socket;
	if (!$client_socket) {
		print "Error Accepting client connection\n\n";
	}
	print "SERVER Waiting for client connection on port $portSync\n";
	$DevClient_socket = $SecSocket->accept();

	$ClientSockets{$TmpRemote."SYNC"} = $DevClient_socket;
	if (!$DevClient_socket) {
		print "Error Accepting client connection\n\n";
	}
}

###############################################################################
# This Subroutine is used to return the ip address of the host on which an device is attached.
sub Fetch_IP {
	my $TmpDev = $_[0];
	
	foreach $ip ( keys %RemoteDevices) {
		foreach $dev ( keys %{$RemoteDevices{$ip}}) {
			if ( $TmpDev eq $RemoteDevices{$ip}{$dev}{'dev'} ) {
				return $ip;
			} 
		}
	}
	return 1;
}

###############################################################################
sub Check_Devices # <$dev> <$cmd>
{
   my $tlog = $LOG . "hc.log"; 
   my $cmd = "hciconfig > $tlog\n";
   &dprint ("--> system $cmd\n");
   system("$cmd\n");
   
   if (!open(TLOG, $tlog)) {
      &dprint ("failed to open $tlog \n");
   }
   while (my $line = <TLOG>){
      if ($line =~ "hci0") {
         &dprint ("hci0 is alive\n");
      }
      if ($line =~ "hci1") {
         &dprint ("hci1 is alive\n");
      }
      if ($line =~ "hci2") {
         &dprint ("hci2 is alive\n");
      }
      if ($line =~ "hci3") {
         &dprint ("hci3 is alive\n");
      }
      if ($line =~ "hci4") {
         &dprint ("hci4 is alive\n");
      }
   }
   # For full Automation Regression
}

###############################################################################

sub Load_Conf_File
{
   my($conf) = $CONFIG;
   my($line);   
   my(@bits);  

   if (!(-r $conf)) 
   {
      print "\n#############################################\n";
      print "You do not have a bats.conf file for Automation Testing requires \n";
      exit(1);
   } 

   open (INF, $conf) || die "ERROR opening $conf... \n";
   while ($line = <INF>) 
   {
      chop($line);
      $line =~ s/#.*//g;
      $line =~ s/\s+//g;
      if ( $line eq "") { } 
      else {
         (@all_bits) = split(/=/,$line);  
          if ($all_bits[0] =~ m/^#/) { @bits = ''; }
          else { 
			       @bits = split(/,/,$all_bits[1]); } 
		# Parsing bats.conf file for existance of any reference devices on secondary host.
		# any devices appended with an valid IP address is considered to be on remote host and two machine architecture is followed.
		# <IP>:<Device>,<interface>........
		# eg: 10.31.131.11:ref1, hci0, .....
		# %RemoteDevices is an global hash used to store details about all the remote devices.
		# $RemoteDeviceFlag = 1 --> Control variable to indicate more than one host is involved in execution.
		 $line =~ s/^\s+//;
		 if ($line =~ m/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]):/ ) {
			my @TmpDevice = split(/:/,$bits[0]);
			$RemoteDeviceFlag = 1;
			if(!exists $RemoteDevices{$TmpDevice[1]}) {
				$RemoteDevices{$TmpDevice[0]}{$TmpDevice[1]}{'dev'} = $TmpDevice[1];
				$RemoteDevices{$TmpDevice[0]}{$TmpDevice[1]}{'port'} = $bits[1];
				$RemoteDevices{$TmpDevice[0]}{$TmpDevice[1]}{'spd'} = $bits[3];
				$all_bits[0] = $TmpDevice[1];
			
			}
		 }

         if ($line =~ m/^dut/)
         {  
            if (!exists $DEVICE{"$all_bits[0]"."port"} ) 	{ $DEVICE{"$all_bits[0]"."port"}  	= $bits[0]; }
            if (!exists $DEVICE{"$all_bits[0]"."fm"} ) 		{ $DEVICE{"$all_bits[0]"."fm"} 		= $bits[1]; }
            if (!exists $DEVICE{"$all_bits[0]"."nfc"} ) 	{ $DEVICE{"$all_bits[0]"."nfc"} 	= $bits[2]; }
            if (!exists $DEVICE{"$all_bits[0]"."spd"} ) 	{ $DEVICE{"$all_bits[0]"."spd"} 	= $bits[3]; }
            $bits[5] =~ s/\s+//g;
            if (!exists $DEVICE{"$all_bits[0]"."bd"} ) 		{ $DEVICE{"$all_bits[0]"."bd"} 		= $bits[4]; }
          }
         if($line=~ /STA_INTF/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."wlan_intf"} = $all_bits[1]; }
	     if($line=~ /STA_IP/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."wlan_ip"}  	= $all_bits[1]; }
		 if($line=~ /STA_MASK/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."wlan_mask"} = $all_bits[1]; }	 		 
		 if($line=~ /STA_ETH_INTF/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."eth_intf"} = $all_bits[1]; }
		 if($line=~ /STA_ETH_IP/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."eth_ip"} 	 = $all_bits[1]; }	
		 if($line=~ /STA_PS_MODE/) { $all_bits[0] = "dut";     $DEVICE{"$all_bits[0]"."ps_mode"} = $all_bits[1]; }	 	  	 

		 if($line=~ /DUT_Release_Version/){ $all_bits[0] = "dut";      $DEVICE{"$all_bits[0]"."rel_version"} = $all_bits[1];}
		 if($line=~ /DUT_Release_Path/) {   $all_bits[0] = "dut";     $all_bits[1] =~ s/\s+|\n+//g;  $DEVICE{"$all_bits[0]"."local_path"} = $all_bits[1];}

          
		 if ($line =~ m/^AP_NAME/){ $all_bits[0] = "access_point";             $DEVICE{"$all_bits[0]"."name"}  		= $all_bits[1]; }
		 if ($line =~ m/^AP_IP/){ $all_bits[0] = "access_point";               $DEVICE{"$all_bits[0]"."ip"} 		= $all_bits[1]; }
		 if ($line =~ m/^AP_USERNAME/){ $all_bits[0] = "access_point";         $DEVICE{"$all_bits[0]"."username"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_PASSWORD/){ $all_bits[0] = "access_point";         $DEVICE{"$all_bits[0]"."password"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_RADIOID/){ $all_bits[0] = "access_point";          $DEVICE{"$all_bits[0]"."radio_id"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_SSID/){ $all_bits[0] = "access_point";             $DEVICE{"$all_bits[0]"."ssid"} 		= $all_bits[1]; }
		 if ($line =~ m/^AP_AGGREGATION/){ $all_bits[0] = "access_point";      $DEVICE{"$all_bits[0]"."aggr"} 		= $all_bits[1]; }
		 if ($line =~ m/^AP_CHANNEL/){ $all_bits[0] = "access_point";          $DEVICE{"$all_bits[0]"."chanVal"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_CHANNEL_WIDTH/){ $all_bits[0] = "access_point";    $DEVICE{"$all_bits[0]"."chanWidth"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_BAND/){ $all_bits[0] = "access_point";             $DEVICE{"$all_bits[0]"."band"} 		= $all_bits[1]; }
		 if ($line =~ m/^AP_THRPUT_TYPE/){ $all_bits[0] = "access_point";      $DEVICE{"$all_bits[0]"."traffic_type"} = $all_bits[1]; }
		 if ($line =~ m/^AP_THRPUT_DIR/){ $all_bits[0] = "access_point";       $DEVICE{"$all_bits[0]"."traffic_dir"} = $all_bits[1]; }
		 if ($line =~ m/^AP_SECURITY/){ $all_bits[0] = "access_point";         $DEVICE{"$all_bits[0]"."security"} 	= $all_bits[1]; }
		 if ($line =~ m/^AP_PASSPHRASE/){ $all_bits[0] = "access_point";       $DEVICE{"$all_bits[0]"."passphrase"} = $all_bits[1]; }
		 if ($line =~ m/^AP_ENCRYPT/){ $all_bits[0] = "access_point";          $DEVICE{"$all_bits[0]"."encpType"} 	= $all_bits[1]; }	 
		 if ($line =~ m/^AP_PASSPHRASE/){ $all_bits[0] = "access_point";       $DEVICE{"$all_bits[0]"."keyMgmtType"} = $all_bits[1]; }
		 if ($line =~ m/^AP_WPA_KEY_TYPE/){ $all_bits[0] = "access_point";     $DEVICE{"$all_bits[0]"."wpaKeyType"}  = $all_bits[1]; }	 
			 
		 if ($line =~ m/^APBackend_IP/){$all_bits[0] = "ap_backEnd";           $DEVICE{"$all_bits[0]"."ip"} = $all_bits[1];}
		 if ($line =~ m/^APBackend_Username/){$all_bits[0] = "ap_backEnd";     $DEVICE{"$all_bits[0]"."username"} 	= $all_bits[1];}
		 if ($line =~ m/^APBackend_Password/){$all_bits[0] = "ap_backEnd";     $DEVICE{"$all_bits[0]"."password"} 	= $all_bits[1];}

         if ($line =~ m/^ref/)
         {
            if (!exists $DEVICE{"$all_bits[0]"."port"} ) 	{ $DEVICE{"$all_bits[0]"."port"} = $bits[0]; }
            if (!exists $DEVICE{"$all_bits[0]"."spd"} ) 	{ $DEVICE{"$all_bits[0]"."spd"} = $bits[1]; }
			$bits[3] =~ s/\s+//g;
            if (!exists $DEVICE{"$all_bits[0]"."bd"} ) 		{ $DEVICE{"$all_bits[0]"."bd"} = $bits[2]; }
			if( $RemoteDeviceFlag ) {
				$DEVICE{"$all_bits[0]"."bd"} = 0;
			}
         }
         if ($line =~ m/^(ndut|nref)/)								
         {
            if (!exists $DEVICE{"$bits[0]"."intf"} ) 	{ $DEVICE{"$bits[0]"."intf"} = $bits[1]; }
            if (!exists $DEVICE{"$bits[0]"."port"} ) 	{ $DEVICE{"$bits[0]"."port"} = $bits[2]; }
         }
      }
   }

	if( $RemoteDeviceFlag ) {
		$DEVICE{"dutbd"} = 0;
	}

	foreach $ip ( keys %RemoteDevices) {
		foreach $dev ( keys %{$RemoteDevices{$ip}}) {
			push(@RemoteInterface,$RemoteDevices{$ip}{$dev}{'dev'});
			
			my @TmpArray = &GetIp();
			foreach (@TmpArray) {
				if ( $_ eq $ip) {
					push(@LocalInterface, $RemoteDevices{$ip}{$dev}{'dev'});
				}
			}
		}
	}
}

###############################################################################

sub Send_CMD # <$dev1> <$command>
{
   my $ldev = $_[0];
   my $handle = "Q_" . $_[0];
   my $fhandle = "L_" . $_[0];
   my $cmd = $_[1];
   my $hcmd;
   my $start;
   my $c_string;
 
   my @parms = @_[1..$#_];
   ($hcmd, $c_string ) = &Build_HCI_Cmd(@parms);
   
   &dprint(" > Command on $_[0] - $cmd\n $c_string");
   #&dprint(" > Command on $_[0] - $hcmd\n");   
   if (($cmd =~ m/FM_/) && ($ldev =~ m/dut/) && ($FMAPP)) {
      $fhandle = "F_" . $_[0];
   }
   if ($HTOOL) {
		$port =  $DEVICE{$_[0]."port"};
		$hcmd = "$HCITOOL $port cmd $hcmd";
		if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};					  
			$data = "$_[0]~HTOOL~$hcmd";
			print  $TmpSock "$data\n";
		} else {
			&dosystem($hcmd);
		}
   } else {
   		# Following control statement decides if the command is meant to be for singal machine execution or multi host execution.
		# If the device is present on secondary host(@RemoteInterface) && batslib instance is on primary host then write the cmd on the socket, or else write the cmd to appropriate btd handle.
		# While writing onto the socket the raw cmd is appended with control strings to identify the cmd on the secondary host, with '~' as delimeter.
		# $_[0]~CMD~gcmd $hcmd --> "<DEV>~~CMD~~<Raw Cmd>"
		if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};
			$data = "$_[0]~CMD~gcmd $hcmd";
			print  $TmpSock "$data\n";
		} else {
			print $handle "gcmd $hcmd\n";
		}
   }
   
   ####In case duiring script COD is updated for any device###
   
   if ($_[1] =~ 'Write_Class_of_Device') {
      select(undef,undef,undef, 0.01); # allow the command to go through
      &Send_CMD($_[0], Read_Class_of_Device);
      $start= tell $fhandle;
      &Wait_For($_[0], Command_Complete_Event, NA, Read_Class_of_Device, 0x00, NA, 4);
      seek $fhandle, $start, 0;
   }
   return 0;
}

###############################################################################

sub Build_HCI_Cmd { # <$ARGV
   my $hcmd = "";
   my $total_arg = @_;
   my $cmd = $_[0];
   my @token;
   my $ogf, $ocf;
   my $i = 0;
   my $j,$k;
   my @tcmd;
   my $cmd_string = "";

   if ($cmd eq "Set_Event_Filter")
   {
      $hcmd = tmp_fix_sef(@_);				#FIX ME - required support for variable length commands like set_event_filter & NFC
      print "\n $hcmd\n" ; 
   }
   elsif ($cmd eq "Write_Current_IAC_LAP")
   {
      $hcmd = tmp_fix_write_LAP(@_);
   }
   else{
	   
	   if($cmd =~ /CAC/i) {      #### If Cardinal_AC FM commandss are there then it will execute this section
         $tcmd = @{$hci_cmd_cac_fm{$cmd}[0]};
         $hcmd = $hci_cmd_cac_fm{$cmd}[0][0] . " " . $hci_cmd_cac_fm{$cmd}[0][1];
        }
      else{
	     $tcmd = @{$hci_cmd{$cmd}[0]};
         $hcmd = $hci_cmd{$cmd}[0][0] . " " . $hci_cmd{$cmd}[0][1];   
	 }
        for ($i=1, $j=2; $i<=$tcmd-2; $i++, $j++){
                my $arg = $_[$i];
                if ($arg =~ /NA/) {
                        if($cmd =~ /CAC/i){
							(@token) = split (/:/,$hci_cmd_cac_fm{$cmd}[0][$j]); }
                        else{
                            (@token) = split (/:/,$hci_cmd{$cmd}[0][$j]);
                            }
                            
                           if ($token[2] eq "") {
                           print "\nDefault parameter not defined in def file for $cmd\n";
                           exit 1;
                        }
                        $hcmd = $hcmd . " " .$token[2];
                        $cmd_string .= "        $token[0] : $token[2]\n";
                }
                else {
                        
                        if ($arg =~/ACL_HDL/ || $arg =~ /BD_ADDR/ || $arg =~/SCO_HDL/ || $arg =~ /LE_HDL/)
                        {
                                $hcmd = $hcmd . " " . $arg . " ";
                                my $ctmp = $arg;
                                $ctmp =~ s/_//;
                                $cmd_string .= "        $ctmp : $arg\n";
                        }
                        else{
                        #Check size of actual argument
                            if($cmd =~ /CAC/i){          #### If Cardinal_AC FM commandss are there then it will execute this section
                                    (@token) = split (/:/,$hci_cmd_cac_fm{$cmd}[0][$j]);}
                            else {
							        (@token) = split (/:/,$hci_cmd{$cmd}[0][$j]);
							  }
                           if ($arg != "") {
                               $arg = substr(Math::BigInt->new($arg)->as_hex, 2);
                           }
                           if ($token[1] == '^') {
                               #This is special case of commands like Set_Event_Filter
                               my $h1 = sprintf ("%2s", $arg);
                               my $t1 = &Little_Endian($h1);   
                               $hcmd = $hcmd . " " . $t1 . " ";
                               $cmd_string .= "        $token[0] : $t1\n";
   
                           }
                           else {
                               my $pad_len = 2 * $token[1];
                               my $h1 = sprintf ("%0${pad_len}s", $arg);
                               my $t1 = &Little_Endian($h1);   
                               $hcmd = $hcmd . " " . $t1 . " ";
                               $cmd_string .= "       $token[0] : $t1\n";
                           }
                           
                        }
                }
            }
        } 
   &dprint("$hcmd","$cmd_string");
   return ($hcmd, $cmd_string);

}
###############################################################################
# Following subroutine is used to synchronize %DEVICE and %LINK DB.
# 'DEV' and 'LINK' keywords identify the DB that needs to be updated.
sub Update_DB {
	my $SockData;
	my @DevArray;
	
	$TmpDevSocket = $ClientSockets{$_[0]."SYNC"};

	while ( $SockData = <$TmpDevSocket>) {
		chomp $SockData;
		# 'THRD' keyword is used to identify any thread intiated &monitor_result subroutine on the secondary machine.
		if ($SockData =~ m/^THRD/ && !$SecondaryHost ) {
			@SocketEvents = split(/~/, $SockData);
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
		@DevArray = split(/:/, $SockData);
		if ( $DevArray[$#DevArray] eq 'DEV' ) {
			my $iter = 0;
			while ($iter < $#DevArray) {
				$tmpStr1 = $DevArray[$iter];
				$tmpStr2 = $DevArray[$iter+1];
				if ( $DEVICE{$tmpStr1} ne $tmpStr2 && $tmpStr2 ne 0){
					if (!( $tmpStr1 ~~ @LocalInterface) ) {
						$DEVICE{$tmpStr1} = $tmpStr2;
					}
				}
				$iter = $iter+2;
			}
		}
		if ( $DevArray[$#DevArray] eq 'LINK' ) {
			my $iter = 0;
			while ($iter < $#DevArray) {
				$tmpStr1 = $DevArray[$iter];
				$tmpStr2 = $DevArray[$iter+1];
				if ( $LINK{$tmpStr1} ne $tmpStr2 && $tmpStr2 ne 0){
					$LINK{$tmpStr1} = $tmpStr2;
				}
				$iter = $iter+2;
			}
		}
	}
}

###############################################################################
sub Send_Cmd_Check_Success # <$dev1> <$command> <$timeout_for_event>
{
   my $handle = "Q_" . $_[0];
   my $cmd = $_[1];
   my $hcmd;
   my $c_string;
   my $res = 0;
   my $fhandle = "L_" . $_[0];
   
   my @parms = @_[1..($#_ -1)];
   ($hcmd, $c_string ) = &Build_HCI_Cmd(@parms);
 
   &dprint(" > Command on $_[0] - $cmd\n $c_string");
   
   if ($HTOOL) {
      $port =  $DEVICE{$_[0]."port"};
      $hcmd = "$HCITOOL $port cmd $hcmd";
	  if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};					  
			$data = "$_[0]~HTOOL~$hcmd";
			print  $TmpSock "$data\n";
	  } else {
			&dosystem($hcmd);
	  }
   } else {
		if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};
			$data = "$_[0]~CMD~gcmd $hcmd";	
			print  $TmpSock "$data\n";
		} else {
			print $handle "gcmd $hcmd\n";
		}
      #print $handle "gcmd $hcmd\n";
   }
   
   &Eat_Logs($_[0]); #clean-up logs
   if (&Find_String($_[0], "Command_Complete_Event", $_[$#_]) !~ m/Status:00/) {
      &monitor_result('error');
   }
   
   if ($_[1] =~ 'Write_Class_of_Device')
   {
      select(undef,undef,undef, 0.01); # allow the command to go through
      &Send_CMD($_[0], "Read_Class_of_Device");
      my $start = tell $fhandle;
      &Wait_For($_[0], Command_Complete_Event, NA, Read_Class_of_Device, 0x00, NA, 4);
      seek $fhandle, $start, 0;
   }
   
   return $res;
}
###############################################################################

sub Send_Link_CMD # <$dev1> <$dev2> <$command>
{
   my $handle = "Q_" . $_[0];
   my $handle2 = "Q_" . $_[1];
   #my $cmd = $_[2];
   my $acl_hdl;
   my $sco_hdl;
   my $bd_addr;
   my $c_string;
   my $hcmd;
   
   my @parms = @_[2..$#_];
   ($hcmd, $c_string ) = &Build_HCI_Cmd(@parms);
   
   $bd_addr = &Little_Endian($DEVICE{$_[1]."bd"});
   $hcmd =~ s/BD_ADDR/$bd_addr/;
   $c_string =~ s/BD_ADDR/$bd_addr/;
   
   $acl_hdl = &Little_Endian($LINK{"ACL".$_[0].$_[1]});
   $sco_hdl = &Little_Endian($LINK{"SCO".$_[0].$_[1]});
   $le_hdl = &Little_Endian($LINK{"LE".$_[0].$_[1]});
   
   $hcmd =~ s/ACL_HDL/$acl_hdl/;
   $hcmd =~ s/SCO_HDL/$sco_hdl/;
   $hcmd =~ s/LE_HDL/$le_hdl/;
   $c_string =~ s/ACL_HDL/$acl_hdl/;
   $c_string =~ s/SCO_HDL/$sco_hdl/;
   $c_string =~ s/LE_HDL/$le_hdl/;
   #&Eat_Logs($_[0]); #clean-up logs
   
   &dprint(" > Command on $_[0] for $_[2]- $hcmd\n $c_string");
   
   if ($HTOOL) {
      $port =  $DEVICE{$_[0]."port"};
      $hcmd = "$HCITOOL $port cmd $hcmd";
	  if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};					  
			$data = "$_[0]~HTOOL~$hcmd";
			print  $TmpSock "$data\n";
	  } else {
			&dosystem($hcmd);
	  }
   } else {   
		if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
			$RemoteIP = &Fetch_IP($_[0]);
			$TmpSock = $ClientSockets{$RemoteIP};
			$data = "$_[0]~CMD~gcmd $hcmd";	
			print  $TmpSock "$data\n";
		} else {
			print $handle "gcmd $hcmd\n";
		}
   }

}
###############################################################################

sub Send_Link_CMD_Check_Success # <$dev1> <$dev2> <$command> <$timeout>
{
   my $handle = "Q_" . $_[0];
   my $handle2 = "Q_" . $_[1];
   my $acl_hdl;
   my $sco_hdl;
   my $bd_addr;
   my $c_string;
   my $hcmd;
   
   my @parms = @_[2..($#_-1)];
   ($hcmd, $c_string ) = &Build_HCI_Cmd(@parms);
   $bd_addr = &Little_Endian($DEVICE{$_[1]."bd"});
   $hcmd =~ s/BD_ADDR/$bd_addr/;
   $c_string =~ s/BD_ADDR/$bd_addr/;

   $acl_hdl = &Little_Endian($LINK{"ACL".$_[0].$_[1]});
   $sco_hdl = &Little_Endian($LINK{"SCO".$_[0].$_[1]});
   $le_hdl = &Little_Endian($LINK{"LE".$_[0].$_[1]});

   $hcmd =~ s/ACL_HDL/$acl_hdl/;
   $hcmd =~ s/SCO_HDL/$sco_hdl/;
   $hcmd =~ s/LE_HDL/$le_hdl/;
   $c_string =~ s/ACL_HDL/$acl_hdl/;
   $c_string =~ s/SCO_HDL/$sco_hdl/;
   $c_string =~ s/LE_HDL/$le_hdl/;
   
   &dprint(" > Command on $_[0] to $_[2] - $cmd\n");
   
   if ($HTOOL) {
      $port =  $DEVICE{$_[0]."port"};
      $hcmd = "$HCITOOL $port cmd $hcmd";
      &dosystem($hcmd);
      
   } else {
      print $handle "gcmd $hcmd\n";
   }
   &Eat_Logs($_[0]); #clean-up logs
   if (&Find_String($_[0], "Command_Complete_Event", $_[$#_]) !~ m/Status:00/) {
      &monitor_result('error');
      exit(1); 
   }
}
###############################################################################

sub Disc_ACL # <$dev1> <$dev2> <$command>
{
   my $handle = "Q_" . $_[0];
   my $dis_res = $_[2];
   my $cmd;
   my $hcmd;
   my $acl_hdl;
   my $result=0;
   my $port =  $DEVICE{$_[0]."port"};
   my $flag = 'LINK';
   my $DeviceStr;

   &Send_Link_CMD($_[0],$_[1], Disconnect, $_[2], $_[3]);
   if ($_[3] == 0x13) {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, 0x16, 4);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, 0x13, 23);
   }
   else {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, NA, 4);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, NA, 23);
   }
   
   # DiscConnection Handle Stuff

   $LINK{"ACL".$_[0].$_[1]} = NULL;
   $LINK{"ACL".$_[1].$_[0]} = NULL;

	$RemoteIP = &Fetch_IP($_[0]);
	if ( ($RemoteDeviceFlag || $SecondaryHost) && $ClientSockets{$RemoteIP."SYNC"} ) {
		foreach $TmpKey (keys %LINK) {
			if( $TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
				push(@DeviceArry, $TmpKey);
				$DeviceStr .= "$TmpKey:$LINK{$TmpKey}:";
			}
		}
		$TmpSock = $ClientSockets{$RemoteIP."SYNC"};
		$DeviceStr .= $flag;	
		print $TmpSock "$DeviceStr\n";
	}
   return $result;
}
###############################################################################

sub Exit_Sniff # <$dev1> <$dev2>
{
my $handle1 = "Q_" . $_[0];
   my $handle2 = "Q_" . $_[1];
   my $fhandle1 = "L_" . $_[0];
   my $fhandle2 = "L_" . $_[1];
   my $command = "";

   my $lastline;
   my $acl_hdl = $LINK{"ACL".$_[0].$_[1]};
   my $result = 1; # 1= fail, 0 = Pass 
   $command = "esniff $acl_hdl";
   
   &dprint("--> $command\n");
   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
   		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~$command";
		print  $TmpSock "$data\n";
   } else {
		print $handle1 "$command\n";
   }
   
   # Connection Handle Stuff
   $lastline = &Wait_For($_[0], "ACTIVE MODE", 5);
   if ($lastline =~ 0) 
    {
     &dprint(" Exit Sniff sucessful\n");
        $result = 0; # Pass
     }
   else {
     &dprint(" Exit Sniff failed\n");
        $result = 1; # Test Fail
  }
        return $result;

}
###############################################################################

sub Disc_SCO # <$dev1> <$dev2> <$command>
{
   my $handle = "Q_" . $_[0];
   my $command = $_[2];
   my $sco_hdl;
   my $result = 0;
   my $flag = 'LINK';
   my $DeviceStr;
   
   &Send_Link_CMD($_[0],$_[1], Disconnect, SCO_HDL, $_[3]);
   if ($_[3] == 0x13) {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, 0x16, 4);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, 0x13, 23);
   }
   else {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, NA, 4);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, NA, 23);
   }
   $LINK{"SCO".$_[0].$_[1]} = NULL;
   $LINK{"SCO".$_[1].$_[0]} = NULL;

    $RemoteIP = &Fetch_IP($_[0]);
	if ( ($RemoteDeviceFlag || $SecondaryHost) && $ClientSockets{$RemoteIP."SYNC"} ) {
		foreach $TmpKey (keys %LINK) {
			if( $TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
				push(@DeviceArry, $TmpKey);
				$DeviceStr .= "$TmpKey:$LINK{$TmpKey}:";
			}
		}
		$TmpSock = $ClientSockets{$RemoteIP."SYNC"};
		$DeviceStr .= $flag;	
		print $TmpSock "$DeviceStr\n";
	}

   return $result;
}
###############################################################################

sub Create_Con
{
   my $attempt = $PAGE_ATTEMPTS;
   my $exit = 1;
   while ($exit) {
      
      #my @TimeStart = localtime;
	  my $t_start = [gettimeofday];
      &Send_Link_CMD($_[0], $_[1], Create_Connection, $_[2], $_[3], $_[4], $_[5], $_[6], $_[7]);
      &Wait_For($_[0], Command_Status_Event, 0x00, NA, Create_Connection, 2);
      
      switch (&Find_String($_[0], Connection_Complete_Event, 7 )) {
         case m/Status:04/ {
            $is_pagetimeout=1;
            $attempt--;
            if ($attempt == 0) {
               $sig_monitor='pagefail';
               &monitor_result($sig_monitor, "Page Timeout Connection $_[0] to $_[1]");
               exit(1);
            }
         }
         case m/Status:00/ {
            $exit=0;
            &Wait_For($_[1], Connection_Complete_Event, 0x00, NA, NA, NA, NA, 26);            
         }
         else  {
               $sig_monitor = 'error';
               &monitor_result;
               exit(1);
         }      
      }
      #my @TimeEnd = localtime;
	  $t_end = [gettimeofday];
      our $val= &GetTimeDifference($t_start,$t_end);
      &dprint("--------------\n   ACL Connection Time : $val secs\n--------------\n\n");
   }
}
###############################################################################

sub Create_LE_Con
{
   my $attempt = $PAGE_ATTEMPTS;
   my $exit = 1;
   
   my $scan_int = $_[2];
   my $scan_wind = $_[3];
   my $fip = $_[4];
   my $peer_addr_typ = $_[5];
   my $own_addr_typ = $_[6];
   my $min_con_int = $_[7];
   my $max_con_int = $_[8];
   my $con_lat = $_[9];
   my $timeout = $_[10];
   my $min_ce_len = $_[11];
   my $max_ce_len = $_[12];
   
   while ($exit) {
      &Send_Link_CMD($_[0], $_[1], LE_Create_Connection, $scan_int, $scan_wind, $fip, $peer_addr_typ, BD_ADDR, $own_addr_typ, $min_con_int, $max_con_int, $con_lat, $timeout, $min_ce_len, $max_ce_len);
      
      switch (&Find_String($_[0], LE_Meta_Event, 10 )) {
         sleep 10;
         case m/Status:3E/ {
            $is_pagetimeout=1;
            $attempt--;
            if ($attempt == 0) {
               $sig_monitor='pagefail';
               &monitor_result($sig_monitor, "Page Timeout Connection $_[0] to $_[1]");
               exit(1);
            }
         }
         
         case m/Status:00/ {
            $exit=0;
            &Wait_For($_[1], LE_Meta_Event, 0x01, 0x00, NA, 01, NA, "BD_ADDR_".$_[0], NA, NA, NA, NA, 2);           
         }
            
         else  {
               $sig_monitor = 'error';
               &monitor_result;
               exit(1);
         }      
      }
      
   }
}
###############################################################################

sub Create_SCO # <$dev1> <$dev2> <$latency> <$vset> <$retrans> <$pkt>
{
   my $handle1 = "Q_" . $_[0];
   my $handle2 = "Q_" . $_[1];
   my $fhandle1 = "L_" . $_[0];
   my $fhandle2 = "L_" . $_[1];
   my $latency = $_[2];
   my $vset = $_[3];
   my $retrans = $_[4];
   my $pkt = $_[5];
   my $hcmd = "";
   my $result = 0;

   my $line;
   my $line2;
   my @bits;
   my $lastline;
   my $acl_hdl = $LINK{"ACL".$_[0].$_[1]};
   # Some more commands to setup voice settings etc.as

   &Send_Link_CMD($_[0],$_[1], Setup_Synchronous_Connection, $_[2], $_[3],$_[4], $_[5],$_[6], $_[7], $_[8]);
   &Wait_For($_[0], Command_Status_Event, 0x00, NA, Setup_Synchronous_Connection,2);
   # Connection Handle Stuff
   #FIX ME
   ####After accepting SCO(not eSCO) Aluratek returns Connect_Complete_event and Marvell device returns Synchronous_Connection_Complete
   ####Need to pass if either of two occurs
   
   &Wait_For($_[0], "Synchronous_Connection_Complete_Event|Connection_Complete_Event", 0x00, "SCO_HDL_.$_[1]",NA,NA,NA,NA,NA,NA,NA,8);
   &Wait_For($_[1], "Synchronous_Connection_Complete_Event|Connection_Complete_Event", 0x00, "SCO_HDL_.$_[0]",NA,NA,NA,NA,NA,NA,NA,8);

   return $result;
}
###############################################################################

sub Add_Sniff # <$dev1> <$dev2> <$max_int> <$min_int> <$attempts> <$timeout>
{
   my $handle1 = "Q_" . $_[0];
   my $handle2 = "Q_" . $_[1];
   my $fhandle1 = "L_" . $_[0];
   my $fhandle2 = "L_" . $_[1];
   my $max_int = $_[2];
   my $min_int = $_[3];
   my $attempts = $_[4];
   my $timeout = $_[5];
   my $command = "";

   my $line;
   my $lastline;
   my $acl_hdl = $LINK{"ACL".$_[0].$_[1]};
   my $result = 1; # 1= fail, 0 = Pass 
   $command = "sniff $acl_hdl $max_int $min_int $attempts $timeout";
   
   &dprint("--> $command\n");
   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
   		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~$command";
		print  $TmpSock "$data\n";
   } else {
	    print $handle1 "$command\n";
   }


   # Connection Handle Stuff
   $lastline = &Wait_For($_[0], "SNIFF MODE", 5);
   if ($lastline =~ 0) 
    {
     &dprint(" Sniff mode sucessful\n");
        $result = 0; # Pass
     }
   else {
     &dprint(" Sniff mode failed\n");
        $result = 1; # Test Fail
  }
        return $result;
}
###############################################################################

sub Wait_For # <device> <Event_Name> <Params> <Timeout in sec>
{
   my $ldev = $_[0];
   my $file_handle = "L_" . $_[0];
   my @expect_event = @_[1..($#_ -1)];
   my $timeout = $_[$#_];
   my $exit = 1;
   my $result = 1; # 1=fail, 0=success
   my $event_id;
   my @l;
   my $next_line;
   my $i;
   my(@bits);
   my $inq_dev=0;
   my $bd_address = "NA";
   my $TmpStr;

   
	# Following control statement decides if the command is meant to be for singal machine execution or multi host execution.
	# If the device is present on secondary host(@RemoteInterface) && batslib instance is on primary host then frame API call string and write into the socket, else remaing portion of the subroutine gets executed.
	# $_[0]~RES~Wait_For~@_ --> "<dev>~~RES~~<Subroutine name>~~<parameters passed into subroutine>"
	# At remote side the subroutine call is made and command is been executed.
	

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Wait_For~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }
   
   if (($expect_event[2] =~ m/FM_/) && ($ldev =~ m/dut/) && ($FMAPP)) {
      $file_handle = "F_" . $_[0];
   }
     
   $timeout = Math::BigFloat->new($timeout*1000);
   Math::BigFloat->accuracy(5);	
    
   #&dprint("--> Waiting for event:$_[1] on $_[0]\n");
   foreach $item (@expect_event)
   {
      if ($item =~ /BD_ADDR_(.*)/) {
         $bd_address = $item;     # storing the BD Address to avoid conversion to hex multiple times due to recursion.
         $item = $DEVICE{$1.'bd'};
      }   
      elsif ($item =~ /COD_(.*)/) {
         $item = $DEVICE{$1.'cod'};
      }
      elsif ($item =~ /ACL_HDL_(.*)/) {
         $item = $LINK{"ACL".$_[0].$1};
      }
      elsif ($item =~ /SCO_HDL_(.*)/) {
         $item = $LINK{"SCO".$_[0].$1};
      }
      elsif ($item =~ /LE_HDL_(.*)/) {
         $item = $LINK{"LE".$_[0].$1};
      }
      elsif ($item =~ /^\d+$/) {
      $item = substr(Math::BigInt->new($item)->as_hex, 2);
      }
   }   
    #&dprint ("===== Checking log $file_handle\n");
   do
   {
      my $start= tell $file_handle;
      $next_line = <$file_handle>;
      $timeout--;
      if ($next_line eq "") {
         #$timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout < 0)
         {
            if ($expect_event[0] =~ /Command_Status_Event/) {
               &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
               &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
            }
            elsif ($expect_event[0] =~ /Command_Complete_Event/) {
               &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
               &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
            }
            else {
               &dprint("\n Timeout Occured for $expect_event[0]");
               &monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
            }
            $exit = 0;
            return $result;
         }
      } 
      else {
         while ($next_line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $next_line = <$file_handle>;
         }
         $match = 0;
         if ( $next_line =~ m/> (.*)/ )
         {
            #&dprint ("\n Event: $1\n)";
            $parsed_event = &Parse_Event($1, $ldev, $expect_event[2]);  ###  $expect_event[2] is added to identify CAC FM commands
         
            
            if ($parsed_event =~ 'Status:00') {
               &event_database($_[0], $parsed_event);
            }
            ##### match the expected event with the parse event####
            (@parsed_event) = split (/-/, $parsed_event);
            #print "\n @parsed_event\n";
            #print "\n @expect_event\n";
            $match = &Match_Event(\@expect_event, \@parsed_event);
            
            if ($parsed_event[0] =~ m/$expect_event[0]/ ) {
               switch ($match) {
                  
                  case 0 {
                     &dprint("Expecting: @expect_event\n");
                     if ($expect_event[0] =~ /Command_Status_Event/) {
                        &dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        &monitor_result('error', "Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        }
                     elsif ($expect_event[0] =~ /Command_Complete_Event/) {
                        &dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[2] on $_[0]");
                        &monitor_result('error', "Mismatch For Event $expect_event[0] for $expect_event[2] on $_[0]");
                        }
                     elsif ($expect_event[0] =~ /LE_Meta_Event/) {
                        if($timeout < 0){
                           &monitor_result('Timeout', "For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        }
                        $timeout--;
                        print "Timeout before div: $timeout";
                        $timeout = $timeout->copy()->bdiv(1000);
                        print "dev: $ldev timeout: $timeout Expect event: @expect_event \n";
                        $expect_event[5] = $bd_address;
                        &Wait_For($ldev,@expect_event, $timeout);  # Recursion, wait for all the parameters in LE_Meta event to match
                     } else {
                        &dprint ("\n Mismatch For Event $expect_event[0] on $_[0]");
                        &monitor_result('error', "Mismatch For Event $expect_event[0] on $_[0]");
                     }
                     #exit(1);
                     return $result;
                  }
                  
                  case 1 {
                     #&dprint "\nAll parameters matched\n";
                     $result = 0;  
                     $exit = 0;
                  }
                  
                  case 2 {
                     #&dprint ("\n Other event. Continue waiting");
                     $timeout--;
                     #&dprint ("---- Timeout $timeout\n");
                     select(undef, undef, undef, 0.001);
                     if ($timeout < 0) {
                        if ($expect_event[0] =~ /Command_Status_Event/) {
                           &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
                           &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        }
                        elsif ($expect_event[0] =~ /Command_Complete_Event/) {
                           &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
                           &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
                        }
                        else {
                           &dprint("\n Timeout Occured for $expect_event[0]");
                           &monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
                        }
                        $exit = 0;
                        return $result;
                     }
                  }
               }
            }
         }
      }
   } while $exit;
   #&dprint ("==== Test Result = $result\n");
   return $result;
}
###############################################################################

sub nWait_For # <device> <Event_Name> <Params> <Timeout in sec>
{
   my $ldev = $_[0];
   my $file_handle = "L_" . $_[0];
   my @expect_event = @_[1..($#_ -1)];
   my $timeout = $_[$#_];
   $timeout *= 1000; ### increasing the granuality for file access
   my $exit = 1;
   my $result = 1; # 1=fail, 0=success
   my $event_id;
   my @l;
   my $next_line;
   my $i;
   my(@bits);
   my $inq_dev=0;
   my $start= tell $file_handle;
   my $TmpStr;


   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~nWait_For~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }

	if (($expect_event[2] =~ m /^FM_/) && ($ldev =~ m/dut/) && ($FMAPP)) {
	      $file_handle = "F_" . $_[0];
   	}
 
   foreach $item (@expect_event)
   {
      if ($item =~ /BD_ADDR_(.*)/) {
         $item = $DEVICE{$1.'bd'};
      }   
      elsif ($item =~ /COD_(.*)/) {
         $item = $DEVICE{$1.'cod'};
      }
      elsif ($item =~ /ACL_HDL_(.*)/) {
         $item = $LINK{"ACL".$_[0].$1};
      }
      elsif ($item =~ /SCO_HDL_(.*)/) {
         $item = $LINK{"SCO".$_[0].$1};
      }
      elsif ($item =~ /LE_HDL_(.*)/) {
         $item = $LINK{"LE".$_[0].$1};
      }
      elsif ($item =~ /^\d+$/) {
      $item = substr(Math::BigInt->new($item)->as_hex, 2);
      }
   }   
    #&dprint ("===== Checking log $file_handle\n");
   do
   {
      my $start= tell $file_handle;
      $next_line = <$file_handle>;
      if ($next_line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout == 0)
         {
            $result = 0;
            $exit = 0;
         }
      }
      else {
         while ($next_line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $next_line = <$file_handle>;
         }
         $match = 0;
         if ( $next_line =~ m/> (.*)/ )
         {
            #&dprint ("\n Event: $1\n)";
            $parsed_event = &Parse_Event($1, $ldev);
            
            if ($parsed_event =~ 'Status:00') {
               &event_database($_[0], $parsed_event);
            }
            ##### match the expected event with the parse event####
            (@parsed_event) = split (/-/, $parsed_event);
            #print "\n @parsed_event\n";
            #print "\n @expect_event\n";
            $match = &Match_Event(\@expect_event, \@parsed_event);
            
            if ($parsed_event[0] =~ m/$expect_event[0]/ ) {
               switch ($match) {
                  
                  case 0 {
                     #&dprint ("\n Event found but parameter mismatch occured\n");
                     $timeout--;
                     #&dprint ("---- Timeout $timeout\n");
                     select(undef, undef, undef, 0.001);
                     if ($timeout == 0) {
                        $result = 0;
                        $exit = 0;
                     }
                  }
                  
                  case 1 {
                     #&dprint ("\nAll parameters matched\n");
                     &monitor_result('error', "unexpected event: $expect_event[0], occured on $_[0]");
                     exit(1);
                  }
                  
                  case 2 {
                     #&dprint ("\n Other event. Continue waiting");
                     $timeout--;
                     #&dprint ("---- Timeout $timeout\n");
                     select(undef, undef, undef, 0.001);
                     if ($timeout == 0) {
                        $result = 0;
                        $exit = 0;
                     }
                  }
               }
            }
         }
      }
   } while $exit;
   
   &dprint ("==== Test Result = $result\n");
   seek $file_handle, $start, 0;
   return $result;
}
###############################################################################

# Look_For This API similar to Wait_For except that it doesn't exit on error/timeouterror
sub Look_For # <device> <Event_Name> <Params> <Timeout in sec>
{
   my $ldev = $_[0];
   my $file_handle = "L_" . $_[0];
   my @expect_event = @_[1..($#_ -1)];
   my $timeout = $_[$#_];
   my $exit = 1;
   my $result = 1; # 1=fail, 0=success
   my $event_id;
   my @l;
   my $next_line;
   my $i;
   my(@bits);
   my $inq_dev=0;
   my $bd_address = "NA";
   my $TmpStr;

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Look_For~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }
    
	if (($expect_event[2] =~ m /^FM_/) && ($ldev =~ m/dut/) && ($FMAPP)) {
     		$file_handle = "F_" . $_[0];
  	}

   $timeout = Math::BigFloat->new($timeout*1000);
   Math::BigFloat->accuracy(5);	
    
   #&dprint("--> Waiting for event:$_[1] on $_[0]\n");
   foreach $item (@expect_event)
   {
      if ($item =~ /BD_ADDR_(.*)/) {
         $bd_address = $item;     # storing the BD Address to avoid conversion to hex multiple times due to recursion.
         $item = $DEVICE{$1.'bd'};
      }   
      elsif ($item =~ /COD_(.*)/) {
         $item = $DEVICE{$1.'cod'};
      }
      elsif ($item =~ /ACL_HDL_(.*)/) {
         $item = $LINK{"ACL".$_[0].$1};
      }
      elsif ($item =~ /SCO_HDL_(.*)/) {
         $item = $LINK{"SCO".$_[0].$1};
      }
      elsif ($item =~ /LE_HDL_(.*)/) {
         $item = $LINK{"LE".$_[0].$1};
      }
      elsif ($item =~ /^\d+$/) {
      $item = substr(Math::BigInt->new($item)->as_hex, 2);
      }
   }   
    #&dprint ("===== Checking log $file_handle\n");
   do
   {
      my $start= tell $file_handle;
      $next_line = <$file_handle>;
      
      if ($next_line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout < 0)
         {
            if ($expect_event[0] =~ /Command_Status_Event/) {
               &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
               #&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
            }
            elsif ($expect_event[0] =~ /Command_Complete_Event/) {
               &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
               #&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
            }
            else {
               &dprint("\n Timeout Occured for $expect_event[0]");
               #&monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
            }
            $exit = 0;
            return $result;
         }
      } 
      else {
         while ($next_line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $next_line = <$file_handle>;
         }
         $match = 0;
         if ( $next_line =~ m/> (.*)/ )
         {
            #&dprint ("\n Event: $1\n)";
            $parsed_event = &Parse_Event($1, $ldev);
            
            if ($parsed_event =~ 'Status:00') {
               &event_database($_[0], $parsed_event);
            }
            ##### match the expected event with the parse event####
            (@parsed_event) = split (/-/, $parsed_event);
            #print "\n @parsed_event\n";
            #print "\n @expect_event\n";
            $match = &Match_Event(\@expect_event, \@parsed_event);
            
            if ($parsed_event[0] =~ m/$expect_event[0]/ ) {
               switch ($match) {
                  
                  case 0 {
                     &dprint("Expecting: @expect_event\n");
                     if ($expect_event[0] =~ /Command_Status_Event/) {
                        &dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
                  #      &monitor_result('error', "Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        }
                     elsif ($expect_event[0] =~ /Command_Complete_Event/) {
                        &dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[2] on $_[0]");
                   #     &monitor_result('error', "Mismatch For Event $expect_event[0] for $expect_event[2] on $_[0]");
                        }
                    else {
                        &dprint ("\n Mismatch For Event $expect_event[0] on $_[0]");
                        #&monitor_result('error', "Mismatch For Event $expect_event[0] on $_[0]");
                     }
                     #exit(1);
                     return $result;
                  }
                  
                  case 1 {
                     #&dprint "\nAll parameters matched\n";
                     $result = 0;  
                     $exit = 0;
                  }
                  
                  case 2 {
                     #&dprint ("\n Other event. Continue waiting");
                     $timeout--;
                     #&dprint ("---- Timeout $timeout\n");
                     select(undef, undef, undef, 0.001);
                     if ($timeout < 0) {
                        if ($expect_event[0] =~ /Command_Status_Event/) {
                           &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
                        #   &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
                        }
                        elsif ($expect_event[0] =~ /Command_Complete_Event/) {
                           &dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
                         #  &monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
                        }
                        else {
                           &dprint("\n Timeout Occured for $expect_event[0]");
                          # &monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
                        }
                        $exit = 0;
                        return $result;
                     }
                  }
               }
            }
         }
      }
   } while $exit;
   &dprint ("==== Test Result = $result\n");
   return $result;

}

#FIX ME - Wait_For, nWait_For & Look_For - repeated code needs to be added as a function
###############################################################################

sub Find_String # <$device> <$string> <$timeout>
{
   my $ldev = $_[0];
   my $file_handle;
   my $string = $_[1];
   my $timeout = $_[$#_];
   $timeout *= 1000; ####increasing the granuality###
   my $exit = 1;
   my $line;
   my @l;
   my $parsed_event;
   my $dev = "FM";
   my $TmpStr;

   if(($FMAPP) && ($_[2] =~ m/^FM/i)) 
   {
     $file_handle ="F_" . $_[0];
    } 
   else 
  {
    $file_handle = "L_" . $_[0]
  }

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "ref1~RES~Find_String~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-- $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ m/(timeout|pagefail|abort_script|exit_script|system_dead)/ ) {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		} else {
			return $SocketEvents[1];
		}
   }

   #&dprint ("===== Finding String $file_handle\n");
   do {
      my $start= tell $file_handle;
      $line = <$file_handle>;
      if ($line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout == 0)
         {
            &dprint ("\n Timeout Occured for $string");
            &monitor_result('timeout', "Timeout For $string on $_[0]");
         }
      } 
      else {
         while ($line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $line = <$file_handle>;
         }
           
         if ( $line =~ m/> (.*)/ )
         {
            #&dprint ("\n Event: $1\n");
            $parsed_event = &Parse_Event($1, $ldev);
         
            if ($parsed_event =~ 'Status:00') {
               &event_database($_[0], $parsed_event);
            }
         
            if ($parsed_event =~ $string) {
               $exit = 0;
            }
         }
         elsif($line =~ /$string/) {
           return $line;
         }
      }
   } while $exit;
   return $parsed_event;
}
###########################################################
sub Check_String # <$device> <$string> <$timeout>
{
   my $ldev = $_[0];
   my $file_handle = "L_" . $_[0];
   my $string = $_[1];
   my $timeout = $_[2];
   $timeout *= 1000; ####increasing the granuality###
   my $exit = 1;
   my $line;
   my @l;
   my $parsed_event;
   my $TmpStr;


   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Check_String~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $string, $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }

   #&dprint ("===== Finding String $file_handle\n");
   do {
      my $start= tell $file_handle;
      $line = <$file_handle>;
      if ($line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout == 0)
         {
            &dprint ("\n Timeout Occured for $string");
            #&monitor_result('timeout', "Timeout For $string on $_[0]");
            return $line;
         }
      } 
      else {
         while ($line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $line = <$file_handle>;
         }
           
         if ( $line =~ m/> (.*)/ )
         {
            #&dprint ("\n Event: $1\n");
            $parsed_event = &Parse_Event($1, $ldev);
         
            if ($parsed_event =~ 'Status:00') {
               &event_database($_[0], $parsed_event);
            }
         
            if ($parsed_event =~ $string) {
               $exit = 0;
            }
         }
         elsif($line =~ /$string/) {
           return $line;
         }
      }
   } while $exit;
   return $parsed_event;
}
###########################################################
sub Find_Str # <$device> <$string> <$timeout>
{
   my $ldev = $_[0];
   my $file_handle = $_[0];
   my $string = $_[1];
   my $timeout = $_[2];
   $timeout *= 1000; ####increasing the granuality###
   my $exit = 1;
   my $line;
   my @l;
   my $parsed_event;
   my $TmpStr;
   
   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Find_Str~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $string, $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }

   #&dprint ("===== Finding String $file_handle\n");
   do {
      my $start= tell $file_handle;
      $line = <$file_handle>;
      if ($line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout == 0)
         {
            &dprint ("\n Timeout Occured for $string");
            &monitor_result('timeout', "Timeout For $string on $_[0]");
         }
      } 
      else {
         while ($line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $line = <$file_handle>;
         }
           
         if($line =~ /$string/) {
           return $line;
         }
      }
   } while $exit;
   return $parsed_event;
}
###############################################################################
#This Subroutine will return Success if the String is not found.

sub nFind_Str {  # <$FileHandle> <$string> <$timeout>
   my $file_handle = $_[0];
   my $string = $_[1];
   my $timeout = $_[2];
   $timeout *= 1000; ####increasing the granuality###
   my $exit = 1;
   my $line;
   my $parsed_event;
   my $TmpStr;

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~nFind_Str~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $string, $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }

   #&dprint ("===== Finding String $file_handle\n");
   do {
      my $start= tell $file_handle;
      $line = <$file_handle>;
      if ($line eq "") {
         $timeout--;
         select(undef, undef, undef, 0.001);
         if ($timeout == 0)
         {
            &dprint ("$string Not FOUND\n");
            return 0;
         }
      }
      else {
         while ($line !~ /\n/)
         {
            seek $file_handle, $start, 0;
            $line = <$file_handle>;
         }
          
         if($line =~ /$string/) {
           &monitor_result('error', "$string Found");
         }
      }
   } while $exit;
   return $line;
}
###############################################################################

sub dosystem # <$cmd>
{
   my $cmd = $_[0];
   #&dprint ("--> system $cmd");
   system("$cmd &");
   # For full Automation Regression
}

# FIX ME - This API needs to be designed, such a way that it will not block
# scripts execution till system API returns and sould able to return status of system commmad.
###############################################################################

# Instert Comments in the log
sub LogComment # <$dev> <$comment>
{
   my $handle = "Q_" . $_[0];
   my $comment = $_[1];
   &dprint ("--> Log $comment\n");

   # For full Automation Regression
}

###############################################################################

sub sendHCI_Cmd # <$dev> <$cmd>
{
   my $port;
   my $cmd = $_[1];
   &dprint ("--> HCI $cmd\n");
}
###############################################################################

sub Dec2Hex # <$value
{
   my $v1 = $_[0];
   my $h1 = sprintf ("%X", $v1);
   &dprint ("String $v1 to hex is $h1\n");
   return $h1;
}
###############################################################################

sub Eat_Logs # <$port
{
   my $file_handle = "L_" . $_[0];
   my $TmpStr;

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {				
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Eat_Logs~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		$data = <$TmpSock>;
	} else {
	   while (<$file_handle>) {;}
	}
}
###############################################################################

sub Init_Auto_Lib
{
   # For full Automation Regression
}
###############################################################################

sub Parse_Event {
    
    my $hci_pkt = $_[0];
    my $praw = $_[0];
    my $event_id = undef;
    my $parsed_event = undef;
    my $hci_pkt_type = undef;
    my $event_size = undef;
    my $pevent = undef;
    
    $hci_pkt =~ s/\s//g;
    $hci_pkt_type = substr $hci_pkt, 0, 2, "";
    $event_id =  substr $hci_pkt, 0, 2, "";
    $event_size = substr $hci_pkt, 0, 2, "";
	&Extract_tag_Addr($hci_pkt); #Added this function for NFC by Nandita
   
    if ($hci_pkt_type eq '04') {
        if (exists $hci_event{$event_id}) {
			
			if($_[2] =~ /CAC/i){         #### If Cardinal_AC FM commandss are there then it will execute this section
	                $parsed_event = &Add_Hash_Param_cac_fm(undef, $hci_pkt, $event_id, \%hci_event);}
            else{
				    $parsed_event = &Add_Hash_Param(undef, $hci_pkt, $event_id, \%hci_event);
		     	}
            $pevent = $parsed_event;
            $pevent =~ s/\-/\n\t/g;
            if (($DPD) && ($pevent !~ m/Number_Of_Completed_Packets_Event/)) {
               &dprint (" < Received Event on $_[1]: $praw\n");
               &dprint (" < Received Event: $pevent\n");
            }

            return "$parsed_event";
        }
        else {
            return ("Unknown Event: $_[0]");
        }
    }
    elsif ($_[1] eq '01') {
        &dprint ("\nCommand\n");
    }
    elsif ($_[1] eq '02') {
        #&dprint ("SCO data");
    }
    else {
        #&dprint ("*");
    }
 
}
###############################################################################

sub Add_Hash_Param {
    
    my $parsed_event =$_[0];
    my $hci_pkt = $_[1];
    my $key = $_[2];
    my $ref = $_[3];
    my $hash_key = undef;
    my $param = undef;
    my $param_value = undef;
    my $param_size = undef;
    my @com_op = ();
    my $cmd_str = undef;
    
    foreach my $i (0 .. $#{$ref->{$key}}) {        
        if (ref($ref->{$key}[$i]) eq "HASH" && $hash_key ne undef) {
            $parsed_event = &Add_Hash_Param($parsed_event, $hci_pkt, $hash_key, $ref->{$key}[$i]);    
        }
        else {
            if ($ref->{$key}[$i] =~ /\s* (\w+) \s* : \s* (\d+)  /x) {
                $param = $1;
                $param_size = $2 * 2;
                if ($param eq "Return_Parameters") {
                    foreach my $k (0 .. $#{$hci_cmd{$cmd_str}[1]}) {
                        $hci_cmd{$cmd_str}[1][$k] =~ /\s* (\w+) \s* : \s* (\d+)  /x;
                        $param = $1;
                        $param_size = $2 * 2;
                        $param_value = substr $hci_pkt, 0, $param_size, "";
                        $param_value = join("", reverse ($param_value =~ m/../g));
                        $parsed_event .= "-" . $param . ":" . $param_value;
                    }
                }
                else {
                    $param_value = substr $hci_pkt, 0, $param_size, "";
                    $param_value = join("", reverse ($param_value =~ m/../g));
                    if ($param eq "Command_Opcode") {
                        @cmd_op =&Opcode( hex $param_value);
                        $cmd_str = &Find_cmd(@cmd_op,$hci_pkt);
                        $parsed_event .= "-" . $param . ":" . $cmd_str;
                    }
                    else {
                        $parsed_event .= "-" . $param . ":" . $param_value;
                    }
                    $hash_key = $param_value;
                }
            }
            else {
                $parsed_event .= $ref->{$key}[$i];
            }
        }
    }
    return $parsed_event;
}
###############################################################################
sub Add_Hash_Param_cac_fm {
    
    my $parsed_event =$_[0];
    my $hci_pkt = $_[1];
    my $key = $_[2];
    my $ref = $_[3];
    my $hash_key = undef;
    my $param = undef;
    my $param_value = undef;
    my $param_size = undef;
    my @com_op = ();
    my $cmd_str = undef;
    
    foreach my $i (0 .. $#{$ref->{$key}}) {        
        if (ref($ref->{$key}[$i]) eq "HASH" && $hash_key ne undef) {
            $parsed_event = &Add_Hash_Param_cac_fm($parsed_event, $hci_pkt, $hash_key, $ref->{$key}[$i]);    
        }
        else {
            if ($ref->{$key}[$i] =~ /\s* (\w+) \s* : \s* (\d+)  /x) {
                $param = $1;
                $param_size = $2 * 2;
                if ($param eq "Return_Parameters") {
                    foreach my $k (0 .. $#{$hci_cmd_cac_fm{$cmd_str}[1]}) {
                        $hci_cmd_cac_fm{$cmd_str}[1][$k] =~ /\s* (\w+) \s* : \s* (\d+)  /x;
                        $param = $1;
                        $param_size = $2 * 2;
                        $param_value = substr $hci_pkt, 0, $param_size, "";
                        $param_value = join("", reverse ($param_value =~ m/../g));
                        $parsed_event .= "-" . $param . ":" . $param_value;
                    }
                }
                else {
                    $param_value = substr $hci_pkt, 0, $param_size, "";
                    $param_value = join("", reverse ($param_value =~ m/../g));
                    if ($param eq "Command_Opcode") {
                        @cmd_op =&Opcode( hex $param_value);
                        $cmd_str = &Find_cmd_CAC(@cmd_op,$hci_pkt);
                        $parsed_event .= "-" . $param . ":" . $cmd_str;
                    }
                    else {
                        $parsed_event .= "-" . $param . ":" . $param_value;
                    }
                    $hash_key = $param_value;
                }
            }
            else {
                $parsed_event .= $ref->{$key}[$i];
            }
        }
    }
    return $parsed_event;
   
}
###############################################################################

sub Opcode{
        my @result;
        $result[0] = ($_[0] >> 10);
        $result[1] = ($_[0] & 0x03FF);
        $result[0] = sprintf ("%02X", $result[0]);      
        $result[1] = sprintf ("%04X", $result[1]);      
        return (@result);
}
###############################################################################
sub Find_cmd_CAC{
    my $result;
    my $k;
	my $fm_cmd =0;
	my $hci_pkt = $_[2]; 
	
 		$fm_cmd = substr $hci_pkt, 0, 2, "";
		$fm_cmd = substr $hci_pkt, 0, 2, ""; 
				
		foreach $k (keys %hci_cmd_cac_fm){
			if($fm_cmd){
				  	
				(@token_c) = split (/:/,$hci_cmd_cac_fm{$k}[0][2]); 
      			if ($fm_cmd eq $token_c[2]) {
		    			$result= $k;
			  		    last;
			     	}
			 	else {
					next;
			    	}
			   }
			else {
                $result= $k;
	            last; 
			  }        
         }
     return $result;
  }   
##############################################################################
sub Find_cmd{
        my $result;
        my $k;
	my $fm_cmd =0;
	my $hci_pkt = $_[2]; 
# Special check for FM commands as all commands are having same OCF	
	if ($_[0] eq "3F" && $_[1] eq "0280") {
		$fm_cmd = substr $hci_pkt, 0, 2, "";
		$fm_cmd = substr $hci_pkt, 0, 2, "";
	}

    foreach $k (keys %hci_cmd){
         if (($_[0] eq  $hci_cmd{$k}[0][0]) && ($_[1] eq  $hci_cmd{$k}[0][1])){
			if ($fm_cmd){
				(@token_c) = split (/:/,$hci_cmd{$k}[0][2]); 	
			     	if ($fm_cmd eq $token_c[2]) {
					$result= $k;
					last;
				}
				else {
					next;
				}
			}
			else {
                        	$result= $k;
	                        last; 
			}  
                }       
        }
        return $result;
}
 ###############################################################################

sub Update_Handle {
	my $k;
	my @bits;
	my $handle;
	my $bd_addr;
	my $bd;
	my $link_type;
	my $status=1;
	my $flag = 'LINK';
	my $DeviceStr;

	(@bits) = split(/Status:/,$_[1]);
	(@bits) = split(/-/,$bits[1]);
	$status =$bits[0];
	if ($status == '00')
	{
		if ($parsed_event =~ m/^LE_Meta_Event.*Subevent_Code:01.*Connection_Handle:(\w{4}).*Peer_Address:(\w{12})/) 
		{
			$handle = $1;
			$bd_addr = $2;
			foreach $k (keys %DEVICE) {
				$k =~ m/(.*)bd/;
				if ($bd_addr eq $DEVICE{$1."bd"}) {
					$LINK{"LE".$_[0].$1} = $handle;
					$BleTest = 1;
				}
			}
		}
		else {
			(@bits) = split(/Connection_Handle:/,$_[1]);
			(@bits) = split(/-/,$bits[1]);

			$handle = $bits[0];

			(@bits) = split(/BD_ADDR:/,$_[1]);
			(@bits) = split(/-/,$bits[1]);
			$bd_addr = $bits[0];

			(@bits) = split(/Link_Type:/,$_[1]);
			(@bits) = split(/-/,$bits[1]);
			$link_type = $bits[0];

			foreach $k (keys %DEVICE)
			{
				my @l = split (/bd/,$k);
				$bd = $DEVICE{$l[0]."bd"};
				if (($bd) && ($bd_addr =~ $bd)){
					if($link_type == '01'){
						$LINK{"ACL".$_[0].$l[0]} = $handle;
					}
					elsif($link_type == '00' || $link_type == '02'){
	
						$LINK{"SCO".$_[0].$l[0]} = $handle;
					}
					else{
						#Reserved for future use!
					}
				}
			}
		}
		
		# Following snippet of code is used to syncronize %DEVICE DB.
		$RemoteIP = &Fetch_IP($_[0]);
		if ( ($RemoteDeviceFlag || $SecondaryHost) && $ClientSockets{$RemoteIP."SYNC"} ) {
			foreach $TmpKey (keys %LINK) {
				if($TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
					$DeviceStr .= "$TmpKey:$LINK{$TmpKey}:";
				}
			}
			$TmpSock = $ClientSockets{$RemoteIP."SYNC"};
			$DeviceStr .= $flag;
			print $TmpSock "$DeviceStr\n";
		}
	}
	&mSleep(750);
}
###############################################################################

sub Match_Event # <expect_event> <parsed_event>
{
   my $match= 1;
   my $other_event = 0;
   my $neg_param;
   my $min_param;
   my $max_param;
   my @expect_params;
   my (@expect_event)= @{$_[0]};
   my (@parsed_event)= @{$_[1]};
   
   for ($i=0; $i <= $#expect_event; $i++)
   {
      if (($parsed_event[$i] =~ /BD_ADDR/ 
			|| $parsed_event[$i] =~ /Command_Opcode/ 
			|| $parsed_event[$i] =~/Connection_Handle/ 
			||$parsed_event[$i] =~ /Subevent_Code/ 
			|| $parsed_event[$i] =~ /Event_ID/ 
			|| $parsed_event[$i] =~ /OpCode/ 
			|| $parsed_event[$i] =~ /Ext_OpCode4/) && ($parsed_event[$i] !~ m/$expect_event[$i]$/i ) && ($expect_event[$i] !~ 'NA')) {
         $other_event = 1; ##could be other event
      }
      #Parameter with negation operator 
      if ($expect_event[$i] =~ /(.*)!/) {
         $neg_param = $1;
         if( $parsed_event[$i] =~ /$neg_param/) {
         $match = 0;
         }
      }
      #Parameter with OR operator
      elsif ($expect_event[$i] =~/\|/) {
         my $found = 0;
         @expect_params = split(/\|/,$expect_event[$i]);
         foreach my $k (@expect_params) {
            $k =~ s/0x//;
            if($parsed_event[$i] =~ m/$k/){
            #if ($expect_event[$i] =~ m/$k$/i)
               $found = 1;
            }
         }
         if ($found == 0) {
            $match = 0;
         }
      }
      
      elsif (($expect_event[$i] !~ 'NA') && ($parsed_event[$i] !~ m/$expect_event[$i]$/i )) {
         $match = 0;
      }

   }
   if ($match == 0 && $other_event == 1) { 
      $match = 2; ###other event confirmed
   }
   return $match;
}

###############################################################################

sub Initialization
{
   if ( (!$REG) || ($_[0] !~ m/dut/) )
   {
      &Send_CMD($_[0], Reset);
      &Wait_For($_[0], Command_Complete_Event, NA , Reset, 0x00, 2);
   }
    &Send_CMD($_[0], Write_Inquiry_Mode, 0x00);
    &Wait_For($_[0], Command_Complete_Event, NA, Write_Inquiry_Mode, 0x00, 2);   

   &Send_CMD($_[0], Set_Event_Filter, 0x00);
   &Wait_For($_[0], Command_Complete_Event, NA, Set_Event_Filter, 0x00, 2); 	
   
   &Send_CMD($_[0], Write_Scan_Enable, 0x03);
   &Wait_For($_[0], Command_Complete_Event, NA, Write_Scan_Enable, 0x00, 2);
   
   &Send_CMD($_[0], Read_BD_ADDR);
   &Wait_For($_[0], Command_Complete_Event, NA, Read_BD_ADDR, 0x00, NA, 2);
   
   &Send_CMD($_[0], Set_Event_Filter, 0x02, 0x00, 0x02);
   &Wait_For($_[0], Command_Complete_Event, NA, Set_Event_Filter, 0x00, 2);
   
   &Send_CMD($_[0], Read_Class_of_Device);
   &Wait_For($_[0], Command_Complete_Event, NA, Read_Class_of_Device, 0x00, NA, 2);
   
   &Send_CMD($_[0], Write_Voice_Setting, 0x60);
   &Wait_For($_[0], Command_Complete_Event, NA, Write_Voice_Setting, 0x00, 2);
   
   &Send_CMD($_[0], Write_Authentication_Enable, 0x00);
   &Wait_For($_[0], Command_Complete_Event,  NA, Write_Authentication_Enable, 0x00, 2);
   
   &Send_CMD($_[0], Write_Page_Timeout, 0x2000);
   &Wait_For($_[0], Command_Complete_Event, NA, Write_Page_Timeout, 0x00, 2);
   
   &Send_CMD($_[0], Write_Connection_Accept_Timeout, 0x2000);
   &Wait_For($_[0], Command_Complete_Event, NA, Write_Connection_Accept_Timeout, 0x00, 2);
   
   &Send_CMD($_[0], Read_Local_Version_Information);
   &Wait_For($_[0], Command_Complete_Event, NA, Read_Local_Version_Information, 0x00, NA, NA, NA, NA, NA, 2);
   
   ##Check If LE supported device, enable LE Meta Events
   if ($DEVICE{$_[0].HCI_Version} eq "Bluetooth Core Specification 4.0") {
      use bigint;
   &Send_CMD($_[0], Set_Event_Mask, 0x2fffffffffffffff);
   &Wait_For($_[0], Command_Complete_Event, NA, Set_Event_Mask, 0x00, 2);
   }
   
   ##Get chip ID of Marvell device
   if ($DEVICE{$_[0].manufacturer} eq "Marvell Technology Group Ltd.") {
      &Send_CMD($_[0], Marvell_Read_Radio_Register, 0x0000, 0x01);
      &Wait_For($_[0], Command_Complete_Event, NA,Marvell_Read_Radio_Register, 0x00, 2);
      $Chip_Name = $DEVICE{$_[0]."chip_id"};

   }
   
   if ($DEVICE{$_[0].manufacturer} eq "Broadcom Corporation.") {
       my $port = $DEVICE{$_[0]."port"};  
       if($HTOOL){
	             system("hcitool -i $port cmd 3f 0022 00" );
                 system("hcitool -i $port cmd 3f 001c 01 02 00 01 01"); 
		 }
	   else{ 
                 &btd_CMD($_[0], "gcmd 3f 0022 00");   
	             &btd_CMD($_[0], "gcmd 3f 001c 01 02 00 01 01");
		}
     }
   ##Get Firmware Version of Marvell device
   #if ($DEVICE{$_[0].manufacturer} eq "Marvell Technology Group Ltd.") {
   #   &Send_CMD($_[0], Marvell_Read_Firmware_Revision);
   #   my @FW_Value = &Get_Event_Data($_[0], Command_Complete_Event, Firmware_Version, 11);
   #   $FW = $FW_Value[0];
   #   $sub1 =hex(substr($FW, 0, 2));
   #   $sub2 =hex(substr($FW, 2, 2));
   #   $sub3 =hex(substr($FW, 4, 2));
   #   $sub4 =hex(substr($FW, 6, 2));
   #   $FW_Ver = "$sub2"."."."$sub3"."."."$sub4"."."."p"."$sub1";
   #   print "\n Firmware Version is $FW_Ver \n";
   #  }
   
   
   return 0;
}   
################################################################

sub monitor_result
{
	my $sig_monitor= $_[0];
	$TEST_RES = 0;
	my $t_comment = "";

	$t_comment = $_[1];

	# If the code instance is running on the secondary machine then return the values to calling API.
	if ($SecondaryHost) {
		return "$sig_monitor~$t_comment";
	}

   switch ($sig_monitor) {
        
      case 'error' {
         print "\n Result => Error\n";
         select(undef,undef,undef, 1);
         $TEST_RES = 1;
         $t_comment = "Error ". $t_comment;
         &Test_Result_Comment($t_comment);
         &Disc_All_ACL;
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 1;
      }
      
      case 'timeout' {
         print "\n Result => Timeout_Error\n";
         select (undef,undef,undef, 1);
         $TEST_RES = 1;
         $t_comment = "Timeout ". $t_comment;
         &Test_Result_Comment($t_comment);
         &Disc_All_ACL;
         &LE_CleanUp;
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 3;
      }
	  case 'nfc_timeout' {
         print "\n Result => NFC Timeout_Error\n\n";
         select (undef,undef,undef, 1);
         $TEST_RES = 1;
         $t_comment = "Timeout ". $t_comment;
         &Test_Result_Comment($t_comment);
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 3;
      }
      case 'pagefail' {
         print "\n Result => Page Timeout\n";
         select(undef,undef,undef, 5);
         $TEST_RES = 1;
         $t_comment = "Error ". $t_comment;
         &Test_Result_Comment($t_comment);
         &Disc_All_ACL;
         &LE_CleanUp;
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 2;
      }
      
  
      case 'end_test' {
         if ($is_pagetimeout ==1) {
            print "Result => Warning_Page_Timeout";
            $t_comment = "Warning: Page Timeout". $t_comment;
            $TEST_RES = 0;
            &Test_Result_Comment($t_comment);
			&Disc_All_ACL;
			&LE_CleanUp;
            &UnLoad_Interface();
            &Comment_To_Wrapper($t_comment, $TEST_RES);
            exit 0;  # need to change to 6 - DPD
         }
         else {
            print "\n Result => OK $t_comment\n";
            $TEST_RES = 0;
            &Test_Result_Comment($t_comment);
			&Disc_All_ACL;
			&LE_CleanUp;
            &UnLoad_Interface();
            &Comment_To_Wrapper($t_comment, $TEST_RES);
            exit 0;
         }
      }
      
      case 'abort_script' {
         print "\n Result => Script Aborted\n";
         $TEST_RES = 1;
         $t_comment = "Script Aborted". $t_comment;
         &Test_Result_Comment($t_comment);
         &Disc_All_ACL;
         &LE_CleanUp;
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 1;
      }
      
      case 'exit_script' {
         print "\n Result => Script Aborted !!\n";
         $TEST_RES = 1;
         $t_comment = "Script Aborted". $t_comment;
         #&Disc_All_ACL;
         # FIX ME - Need to clean up here later --- DPD
         system("killall -9 hcidump\n");
         system("killall -9 hcitool\n");
         system("killall -9 btd\n");
         &Test_Result_Comment($t_comment);
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 4;
      }
      case 'system_dead' {
         print "\n Result => System Hang !!\n";
         $TEST_RES = 1;
         $t_comment = "System Hang". $t_comment;
         #&Disc_All_ACL;
         # FIX ME- Need to clean up here later --- DPD
         system("killall -9 hcidump\n");
         system("killall -9 hcitool\n");
         system("killall -9 btd\n");
         &Test_Result_Comment($t_comment);
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 5;
      }
      case 'na' {						#na = Not Applicable. The test scenario does not suite the device under test.
         print "\n Result => Test Scenario Not Applicable.\n";
         select (undef,undef,undef, 2);
         $TEST_RES = 1;
         $t_comment = "Not Applicable ". $t_comment;
         &Test_Result_Comment($t_comment);
         &Disc_All_ACL;
         &LE_CleanUp;
         &UnLoad_Interface();
         &Comment_To_Wrapper($t_comment, $TEST_RES);
         exit 6;
      }
	  case 'Build_Copy_Failed' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(1, $MailAddr);
         exit 7;
      }
      case 'mount_failed' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(2, $MailAddr);
         exit 7;
      }
      case 'folder_error' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(3, $MailAddr);
         exit 8;
      }
      case 'wlan_Load_Failed' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(4, $MailAddr);
         exit 9;
      }
     case 'BT_Load_Failed' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(5, $MailAddr);
         exit 10;
      }
     case 'FW_Copy_Failed' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(6, $MailAddr);
         exit 11;
      }  
     case 'Incorrect_BT-WLAN_Interface' {						#na = Not Applicable. The test scenario does not suite the device under test.
         select (undef,undef,undef, 2);
         &SendMail(7, $MailAddr);
         exit 12;
       }       
   }
}
###############################################################################
sub SendMail {

    our @lines;
    our $SysAddr;
    our @LanInterface;
    my $HostName;
    my %params;
    my $date;
    my $binPath = 'bin';
    my $ToAddr = $_[1];
    my $RegTime = qx|date| or die("Cant get info on Regression start time: ".$!);
    my $ResString;
    my $P_FILE  = "/root/BATS/build.tmp";
    my $build;
        
    open (FH5, $P_FILE) or print "\nSystem Failed to open file \n";
     if (-r $P_FILE){
           while(<FH5>){
					chomp $_;
					$build = $_;
				    }
				}                                
	$ToAddr =~ s/^\s+//;
    
	if ( $MailAddr ne 0 ) { 
		 use MIME::Lite::TT::HTML;
	}
    print "--> Mail Box..\n";
    my $string = 'Your Run is ';

    @LanInterface = qx|ifconfig| or die("Cant get info on interfaces: ".$!);
    foreach(@LanInterface){
        if($_ =~ m/eth/){
	    $_ =~ s/\s.*//;
	    #print "$_\n";
	    @lines = qx|ifconfig| or die("Cant get info from ifconfig: ".$!); 
	    foreach(@lines){
	        if($_ =~ m/inet addr:/){
        	    $SysAddr=$_;
	            $SysAddr =~ s/^\s*//;
	            $SysAddr =~ s/inet addr://;
	            $SysAddr =~ s/\s.*//;
		    $SysAddr =~ s/\n$//;
	            #print "$SysAddr\n";
	         }
	      }
       }
    }

    $HostName = qx|hostname| or die("Cant get info on hostname: ".$!);
    chomp $HostName;
    $date = qx|date| or die("Cant get info on date: ".$!);

    $params{ip_addr} = $SysAddr;
    $params{host_name}  = $HostName;
    $params{datetime} = $RegTime;
    $params{build} = $build;

    if ($_[0] == 1)   { $string .= ' aborted....!!!!'; $ResString = 'Build Copy into local machine Failed: '; }
    elsif($_[0] == 2) { $string .= ' aborted....!!!!'; $ResString = 'Either File/directory not present or Permission denied or Build Server Mount Failed: '; }
    elsif($_[0] == 3) { $string .= ' aborted....!!!!'; $ResString = 'Build Folder is not exist: '; }
    elsif($_[0] == 4) { $string .= ' aborted....!!!!'; $ResString = 'WLAN driver load failed'; }
    elsif($_[0] == 5) { $string .= ' aborted....!!!!'; $ResString = 'BT driver load failed'; }
    elsif($_[0] == 6) { $string .= ' aborted....!!!!'; $ResString = 'FW_Copy_Failed'; }
    elsif($_[0] == 7) { $string .= ' aborted....!!!!'; $ResString = 'Please enter correct BT-WLAN_Interface'; }
	
    $params{string}  = $string;
	sleep 1;
    $CurrentPath =~ s/\n+//;
    chdir("$CurrentPath");

    my $msg = MIME::Lite::TT::HTML->new(
        From        =>  $HostName.'@sanityautomationStation.com',
        To          =>   $ToAddr,
        Subject     =>  "$string$ResString"." ".'Sanity Automation Result'." "."$date",
        Template    =>  {
		    	text    =>  $binPath.'/test.txt.tt',
		    	html    =>  $binPath.'/test.html.tt',
			},
        TmplOptions =>  \%options,
        TmplParams  =>  \%params,
        );
    #$msg->attr("content-type"  => "text/html");         
    $msg->send or print "Unable to send message: $!";
 
 }
###############################################################################
sub stop_test
{  
   select(undef,undef,undef, $exec_time);
   $stop_test=0;
   return 0;
}
###############################################################################

sub Disc_All_ACL
{
   #print %LINK;
   while ((my $key, my $value) = each %LINK) {
      if ($key =~ m/ACLdut/ && $value != NULL) {
         &Send_CMD("dut", "Disconnect", hex ($value), "19");
         sleep 1;
	   #&Wait_For(dut, Disconnection_Complete_Event, NA, NA, NA, 1);
      }
   }
}
###############################################################################

sub LE_CleanUp
{   
	if ($ReturnVersion[3] >= 06 && $BleTest ) {
   		&dprint("Disconnecting all LE connections\n");
   		while ((my $key, my $value) = each %LINK) {
	    	if ( $key =~ m/LEdut/ && $value != 'NULL' ) {
	        	&Send_CMD(dut, "Disconnect", $value, "13");
	         	sleep 1;
				#&Wait_For(dut, Disconnection_Complete_Event, NA, NA, NA, 1);
	      	}
	   	}
	  	&Send_CMD(dut, LE_Set_Advertising_Enable, 0x00);
	  	sleep 1;
	  	#&Wait_For(dut, Command_Complete_Event, NA, LE_Set_Advertising_Enable, NA, 1);	
	  	&Send_CMD(dut, LE_Set_Scan_Enable, 0x00, 0x00);
	  	sleep 1;
	  	#&Wait_For(dut, Command_Complete_Event, NA, LE_Set_Scan_Enable, NA, 1);	
	}
}
###############################################################################

sub event_database #<dev> <parsed_event>

{
	 my $flag = 'DEV';
	 my $DeviceStr;
      $parsed_event=$_[1];
      switch ($parsed_event) {
         
         case m/Read_BD_ADDR/  {
            (@bits) = split(/BD_ADDR:/,$parsed_event);
            $DEVICE{$_[0]."bd"} = $bits[1];
            print("\nBD Adress of $_[0] is $bits[1] \n");
            
         }
         
         case m/Connection_Complete_Event/ {
            &Update_Handle($_[0], $parsed_event);
         }
         
         case m/Synchronous_Connection_Complete/ {
            &Update_Handle($_[0], $parsed_event)
         }
         
         case m/Read_Class_of_Device/ {
            (@bits) = split(/Class_of_Device:/,$parsed_event);
            $DEVICE{$_[0]."cod"} = $bits[1];
         }
		 case m/LE_Meta_Event-Subevent_Code:01/ {
            &Update_Handle($_[0], $parsed_event);
		 }
         case m/Read_Local_Version_Information/ {
            $parsed_event =~ /Read_Local_Version_Information.*HCI_Version:(\w{2}).*HCI_Revision:(\w{4}).*Manufacturer_Name:(\w{4})/;
            #too store hci_ver from hcidef file - RajeshG
            $DEVICE{$_[0]."HCI_Version"} = $hci_ver{$1};
            #$DEVICE{$_[0]."HCI_Version"} = $1;
            $DEVICE{$_[0]."HCI_Revision"} = $2;
            $DEVICE{$_[0]."manufacturer"} = $manufacturer{$3};
         }
         
         case m/Marvell_Read_Radio_Register/ {
            $parsed_event =~ /Marvell_Read_Radio_Register.*Register_Value:(\w{2})/;
            $DEVICE{$_[0]."chip_id"} = $chip_id{$1};                                                                  
         }
    }
	
	# Following snippet of code is used to sync LINK DB.
	$RemoteIP = &Fetch_IP($_[0]);
	if ( ($RemoteDeviceFlag || $SecondaryHost) && $ClientSockets{$RemoteIP."SYNC"} ) {
		$DeviceStr = '';
		foreach $TmpKey (keys %DEVICE) {
			if( $TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
				#push(@DeviceArry, $TmpKey);
				$DeviceStr .= "$TmpKey:$DEVICE{$TmpKey}:";
			}
		}
		$TmpSock = $ClientSockets{$RemoteIP."SYNC"};
		$DeviceStr .= $flag;
		print $TmpSock "$DeviceStr\n";
	}
}
###############################################################################

sub btd_CMD {
   $PORT = $_[0];
   $cmd = $_[1];
   $handle = "Q_" . $PORT;
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~$cmd";
		print  $TmpSock "$data\n";
	} else {
		print $handle "$cmd\n";   
	}
}
###############################################################################

sub Get_Event_Data # <$dev> <$Event_name> <Parameter> <timeout>
{
    my $j = $#_ - 2;
    my $counter = 2;
    my @Ret_array;
    my $i = 0;
    my $event;
    $event= &Find_String($_[0], $_[1],$_[2], $_[$#_]);
   
   @l= split (/-/, $event);
    do  {
          foreach $k (@l) 
           {
             if ($k =~ m/^$_[$counter]:/) 
               {
                $k =~ s/\w*://;
                @Ret_array[$i] = $k;
                $i++;
                $counter++
               }
           }
       }while($counter <= $j);
        return @Ret_array;
}
###############################################################################

sub Little_Endian { 
        my $result;
        $result = join(" ", reverse($_[0] =~ m/../g));
        return $result; 
}
###############################################################################

sub dev_log
{
    my $ldev = $_[0];
	my $logfile;
	my $logfile1;

	$logfile= $LOG . $TEST_NAME . "_" . $_[0] . ".log";
    $logfile1= $LOG . "perl_". $TEST_NAME . "_" . $_[0] . ".log";
	if (-e $logfile) {
		&Manage_log($ldev, $logfile, $logfile1);
	}

	$logfile= $LOG . $TEST_NAME . "_NFC_" . $_[0] . ".log";
    $logfile1= $LOG . "perl_". $TEST_NAME . "_NFC_" . $_[0] . ".log";
	if (-e $logfile) {
		&Manage_log($ldev, $logfile, $logfile1);
	}
	# Decode FM log file
	$logfile= $LOG . $TEST_NAME . "_" . $_[0] . "_" . "fm" .".log"; 
	if (-e $logfile) {
		&Manage_log_NFC($ldev, $logfile, $logfile1);
	}

	return 0;
}
###############################################################################

sub Manage_log {
	my $ldev = $_[0];
    my $logfile = $_[1];
    my $logfile1 = $_[2];
    my $line;
    my $timestamp;
    my $parsed_event;
    my @l;

    $DPD = 0;
    ###Enter log header i.e. time, duration, name of script, etc

    open(fhandle, "<$logfile") or die "an error occured:$!";
    open(fhandle1, ">$logfile1") or die "an error occured:$!";
    while (<fhandle>){
        $line=$_;
        switch($line) {
        	case m/.* \s \( \d+ \)> \s .*/x {
        	    $line =~ m/(.*) \s \( \d+ \)> \s (.*)/x;
                $timestamp = $1;
                $parsed_event = &Parse_Event($2, $ldev);
                print fhandle1 "\n $timestamp >";
                (@l)=split(/-/, $parsed_event);
                foreach $value (@l) {
                    print fhandle1 "  $value\n";
                }
        	}
            case m/> 02/ {
        	    ####Data Packet####
            }
            case m/> 03/ {
         	   ###SCO packet#####
            }
            case m/< 01/ {
         	   	#####HCI Command####
               	(@l)= split (/ /, $line);
               	$timestamp= shift (@l);
               	print fhandle1 "\n $timestamp <";
               	$opcode = $l[3] . $l[2];
               	@cmd_op =&Opcode( hex $opcode);     
               	$cmd_str = &Find_cmd(@cmd_op);
               	print fhandle1 " $cmd_str\n";

               	my $tlen = @{$hci_cmd{$cmd_str}[0]};
               	$j=5;

               	for (my $m=2; $m < $tlen; $m++) {
          	   		(@token_c) = split (/:/,$hci_cmd{$cmd_str}[0][$m]);     
	                 for ($k=0; $k < $token_c[1]; $k++) {
    	   	       	 	$param = $param . " " .$l[$j];
                   		$j++;       
                	 }
               		 $param = join ("",reverse split(" ",$param));

					print fhandle1 "  $token_c[0]:$param\n";
                    $param="";
                }
			} else {
				#####BTD string########
                if($line =~ m/received_acl_data/) {
					print fhandle1 "^";
				} else {
					print fhandle1 "\nBTD:$line";
				}
			}
		}
	} # While loop
    print fhandle1 "\n\n end of log: $logfile \n";
    print fhandle1 "$LOG_COMMENT\n";

	close fhandle;
	close fhandle1;

	if ((!unlink($logfile)) && (-e $logfile)) {
		print "*FAILED*\nUnable to delete logfile $logfile.\n";
		# exit(1);
	}
	rename ($logfile1, $logfile);
}


###############################################################################
sub Parse_HCI_Cmd
{
   my @parms = split (/ /, $_[0]);
   $opcode = $l[3] . $l[2];
   @cmd_op =&Opcode( hex $opcode);     
   $cmd_str = &Find_cmd(@cmd_op);
   print fhandle1 " $cmd_str\n";
   my $tlen = @{$hci_cmd{$cmd_str}[0]};
   $j=5;
   for (my $m=2; $m < $tlen; $m++) {
       (@token_c) = split (/:/,$hci_cmd{$cmd_str}[0][$m]);     
       for ($k=0; $k < $token_c[1]; $k++) {
           $param = $param . " " .$l[$j];
           $j++;       
       }
       $param = join ("",reverse split(" ",$param));
       print fhandle1 "  $token_c[0]:$param\n";
       $param="";
   }
}
###############################################################################

sub log_gen
{
	my $lfile;
	my $nfile;

	if ((($ENV{"_T_LOGFLAG"}) eq "ALL") ||
		((($ENV{"_T_LOGFLAG"}) eq "FAIL") && ($TEST_RES == 1)) ||
		(!($ENV{"_T_LOGFLAG"})))
	{   
		for (my $i=0; $i<=($num_dev-1); $i++)
		{
			if ($i==0) {
				# Following control statment is made use to identify device is on secondary host or not.
				if (!('dut' ~~ @RemoteInterface)) {
					&dev_log("dut");
				} elsif (!$SecondaryHost)  {
					$RemoteIP = &Fetch_IP('dut');
					$lfile = $LOG . $TEST_NAME . "_" . "dut" . ".log";
					&Retrive_Files($RemoteIP, $lfile);
					&dev_log("dut");
				}
			} else {
				if (!("ref$i" ~~ @RemoteInterface)) {
					&dev_log("ref$i");
				} elsif (!$SecondaryHost)  {
					$RemoteIP = &Fetch_IP("ref$i");
					$lfile = $LOG . $TEST_NAME . "_" . "ref$i" . ".log";
					&Retrive_Files($RemoteIP, $lfile);
					&dev_log("ref$i");
				}
			}
		}
	} else {
		# Delete Logs
		for (my $i=0; $i<=($num_dev-1); $i++)
		{
			if ($i==0) {
				$lfile= $LOG . $TEST_NAME . "_" . "dut" . ".log";
				$nfile= $LOG . $TEST_NAME . "_NFC_" . "dut" . ".log";
			} else {
				$lfile= $LOG . $TEST_NAME . "_" . "ref$i" . ".log";
				$nfile= $LOG . $TEST_NAME . "_NFC_" . "ref$i" . ".log";
			}
			if ((!unlink($lfile)) && (-e $lfile)) {
				print "*FAILED*\nUnable to delete logfile $lfile.\n";
			}
			if ((!unlink($nfile)) && (-e $nfile)) {
				print "*FAILED*\nUnable to delete logfile $lfile.\n";
			}
		}
		
		print "DBG: -----> $LOG\n";
		if ( $LOG ne "logs/" ) {
			print "DBG:---> AM here .... \n\n";
			system("rm -rf $LOG");
		}
	}
}

###############################################################################

sub Clean_UP_TLOG
{
   if (-r $TFILE) {
   if (!unlink($TFILE)) {
      print "*FAILED*\nUnable to Clobber Old $TFILE.\n";
      exit(1);
      }
   }
}
###############################################################################

sub Check_REG_Running
{
    my $reg_running = 0;
    
    if ($ENV{"_BT_REG"}) {
        $reg_running = 1;
    }
    return ($reg_running);
}
###############################################################################

sub Save_TLOG
{
   open TF, "> $TFILE" or die "Can't open $TFILE $!";
   print TF $_[0];
   close TF;
}
###############################################################################

# This function can send fixed pattern data
sub Send_Data
{
   $PORT = $_[0];
   $handle = "Q_" . $PORT;
   if ($_[2] eq "ACL_HDL") {
	   $hdl = hex ($LINK{"ACL".$_[0].$_[1]});
   }
   elsif ($_[2] eq "SCO_HDL") {
		$hdl = hex ($LINK{"SCO".$_[0].$_[1]});
   }
   elsif ($_[2] eq "LE_HDL") {
      $hdl = hex ($LINK{"LE".$_[0].$_[1]});
   }
   else {
	$hdl = hex ($_[2]);
   }
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~send $_[3] 1 $hdl";
		print  $TmpSock "$data\n";
	} else {
		print $handle "send $_[3] 1 $hdl\n";
	}	

}
###############################################################################

# This function can receive fixed pattern data and compare it
sub Receive_Data
{
   my $logfile;
   my $start_pos;
   my $fail_string = "DATA LOST OR CORRUPTED";
   my $fail_string1 = "FRAME ERROR";
   my $fhandle = "L_". $_[1];
   my $fhandle_t;
   my $exit = 1;
   my $result = 1; # 1=fail, 0=success
   my $timeout = $_[$#_];
   $timeout *= 1000; ### increasing the granuality for file access
   $start_pos = tell $fhandle;

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {				
		$data = "$_[0]~THREAD~Receive_Data~@_";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		return;
   }

   $logfile = $LOG . $TEST_NAME . "_" . $_[0] . ".log";
   #print "\n trying to open $logfile";
   open ($fhandle_t, "<$logfile") || die "Couldn't open $log_file :$!";
   seek $fhandle_t, $start_pos, 0;
	do {
		$timeout--;
		if ($timeout == 0)
		{
			$exit =0;
		}
	
		my $start= tell $fhandle_t;
		$next_line = <$fhandle_t>;
		# while ($next_line !~ /\n/)
		# {
		# 	   seek $fhandle_t, $start, 0;
		#     $next_line = <$fhandle_t>;
		# }
      
		if ($next_line =~ m/$fail_string/) {
			&dprint ("$fail_string");
			&monitor_result('error', $fail_string);
		} elsif ($next_line =~ m/$fail_string1/) {
			&dprint ("$fail_string1");
			&monitor_result('error', $fail_string1);
		}
		select(undef,undef,undef, 0.001); #Sleep for 1ms      
	} while $exit
}
###############################################################################

#Send Uni Directional Acl data using NXP BT Test tool.
sub MrvlACLTool_Send_Data #<device1> <device2>
{
   my $server = $DEVICE{$_[0]."port"};
   my $client = $DEVICE{$_[1]."port"};
   my $pkt_type = $_[2];
   my $data_pat = $_[3];
   my $mtu = $_[4] || 1021;
   my $value = $_[5];
   my $role = $_[6];
   my $bd_addr = $_[7];
   my $send_typ = $_[8] || "-t";
   my $PSM = $_[9] || 0x1001;
   my $server_log_file = $_[10] || "server.txt";
   my $client_log_file = $_[11] || "client.txt";
   
   my $timeout *= 1000;
 
      
   if ($bd_addr =~ /BD_ADDR_(.*)/) {
         $bd_addr = $DEVICE{$1.'bd'};
         $char = ":";
         $bd_addr = substr($bd_addr, 0, 2). $char . substr($bd_addr, 2);
         $bd_addr = substr($bd_addr, 0, 5). $char . substr($bd_addr, 5);
         $bd_addr = substr($bd_addr, 0, 8). $char . substr($bd_addr, 8);
         $bd_addr = substr($bd_addr, 0, 11). $char . substr($bd_addr, 11);
         $bd_addr = substr($bd_addr, 0, 14). $char . substr($bd_addr, 14);
      }
   my $cmd1 = "./Mrvl_Tool/MrvlAclTestApp.exe -i $server -s -P $PSM -p $pkt_type -d $data_pat -I $mtu -M $role"; # $mtu=6000 for max thruput.
   my $cmd2 = "./Mrvl_Tool/MrvlAclTestApp.exe -i $client -d $data_pat -p $pkt_type -m $mtu -P $PSM $send_typ $value -c $bd_addr";
   
   print "BD_ADDRESS= $bd_addr \n";
   &dprint("\n Sending uni-direction data from $client to $server ...\n");
   
   &Send_System_CMD_Handler(dut, $cmd1 , 1, $server_log_file);
   &Send_System_CMD_Handler(dut, $cmd2 , 1, $client_log_file);

   #&dosystem("./MrvlAclTestApp.exe -i $server -s -P $PSM -p $pkt_type -d $data_pat -I 6000 -M $role > $server_log_file");
   #&dosystem("./MrvlAclTestApp.exe -i $client -d $data_pat -p $pkt_type -m $mtu -P $PSM $send_typ $value -c $bd_addr > $client_log_file");
   #&dprint("\n Sending uni-direction data from $client to $server ...\n");
  
}
###############################################################################

sub MrvlACLTool_Send_Bi_Data #<device1> <device2>
{
   my $server = $DEVICE{$_[0]."port"};
   my $client = $DEVICE{$_[1]."port"};
   my $pkt_type = $_[2];
   my $data_pat = hex $_[3];
   my $mtu = $_[4] || 1021;
   my $value = $_[5];
   my $role = $_[6];
   my $bd_addr = $_[7];
   my $send_typ = $_[8] || "-t";
   my $PSM = $_[9] || 0x1001;
   my $server_log_file = $_[10] || "server.txt";
   my $client_log_file = $_[11] || "client.txt";
   my $timeout *= 1000;
    
   
   if ($bd_addr =~ /BD_ADDR_(.*)/) {
         $bd_addr = $DEVICE{$1.'bd'};
         $char = ":";
         $bd_addr = substr($bd_addr, 0, 2). $char . substr($bd_addr, 2);
         $bd_addr = substr($bd_addr, 0, 5). $char . substr($bd_addr, 5);
         $bd_addr = substr($bd_addr, 0, 8). $char . substr($bd_addr, 8);
         $bd_addr = substr($bd_addr, 0, 11). $char . substr($bd_addr, 11);
         $bd_addr = substr($bd_addr, 0, 14). $char . substr($bd_addr, 14);
      }
   print "BD_ADDRESS= $bd_addr \n";
   my $cmd1 = "./Mrvl_Tool/MrvlAclTestApp.exe -i $server -s -r -t $value -p $pkt_type -I 15000 -P $PSM";
   my $cmd2 = "./Mrvl_Tool/MrvlAclTestApp.exe -i $client -t $value -p $pkt_type -P $PSM -c -q $bd_addr";
   
    &Send_System_CMD_Handler(dut, $cmd1 , 1, $server_log_file);
   sleep 2;
   &Send_System_CMD_Handler(dut, $cmd2 , 1, $client_log_file);
   #&dosystem("./Mrvl_Tool/MrvlAclTestApp.exe -i $server -s -r -t $value -p $pkt_type -I 15000 -P $PSM -L $server_log_file");
   #&dosystem("./MrvlAclTestApp.exe -i $client -t $value -p $pkt_type -P $PSM -c -q $bd_addr -L $client_log_file");
   #&dprint("\n Sending bi-direction data from $client to $server ...\n");
}
###############################################################################

sub Test_Result_Comment
{
   my $t_comment = $_[0];
   
   if ($TEST_RES == 0){
      $LOG_COMMENT = "\n=== Test: $TEST_NAME = PASSED \n ";
      #print "\n=== Test: $TEST_NAME = PASSED \n ";
   } else {
      $LOG_COMMENT = "\n=== Test: $TEST_NAME = FAILED - $t_comment \n ";
      #print "\n=== Test: $TEST_NAME = FAILED - $t_comment \n ";
   }
}
###############################################################################

sub Comment_To_Wrapper {
  
   my $t_comment = $_[0];
   my $t_result = $_[1];
      
   if ($REG) {
      &Save_TLOG($t_comment );
   } else {
      &dprint ($LOG_COMMENT);    
   }
       
}
###############################################################################

sub Send_Data_Stream { #<from_dev> <to_dev> <bytes> <ACL_HDL/SCO_HDL>
                       #<data_integrity_check_enable/disable>
   
   my $handle = "Q_". $_[0];
   my $fhandle = "L_". $_[1];
   my $bytes = $_[2];
   my $ref_dev = $_[1];
   my $start_pos;
   
   if ($_[3] eq "ACL_HDL") {
      $hdl = hex ($LINK{"ACL".$_[0].$_[1]});
   }
   elsif ($_[3] eq "SCO_HDL") {
      $hdl = hex ($LINK{"SCO".$_[0].$_[1]});
   }
   elsif ($_[3] eq "LE_HDL") {
      $hdl = hex ($LINK{"LE".$_[0].$_[1]});
   }
   else {
      $hdl = hex ($_[2]);
   }

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~test 5 $bytes $hdl";
		print  $TmpSock "$data\n";
	} else {
		print $handle "test 5 $bytes $hdl\n";
	}

   $start_pos = tell $fhandle;
   if ($_[4]) {
      threads->create(\&Check_Data_Integrity, $ref_dev, $start_pos)->detach();
   }
   return 0;
   
}
###############################################################################

sub Check_Data_Integrity {
  
   my $logfile;
   my $start_pos = $_[1];
   my $fail_string = "DATA LOST OR CORRUPTED";
   my $fail_string1 = "FRAME ERROR";
   my $fhandle;
   my $Control = 0;
   my $Str;
 
 
 	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$data = "$_[0]~THREAD~Check_Data_Integrity~@_";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		return;
   }

   $logfile = $LOG . $TEST_NAME . "_" . $_[0] . ".log";
   print "\n trying to open $logfile";
   open ($fhandle, "<$logfile") || die "Couldn't open $log_file :$!";
   seek $fhandle, $start_pos, 0;

   while (1) {
      my $start= tell $fhandle;
      $next_line = <$fhandle>;
      while ($next_line !~ /\n/)
      {
         seek $fhandle, $start, 0;
         $next_line = <$fhandle>;
      }

	  if ($next_line =~ m/$fail_string1/) {
		if ( $Control eq 0) {
			$Control = 1;
			&dprint("$fail_string1");
			$Str = $fail_string1;
		}
	  }
	  if ($next_line =~ m/$fail_string/) {
		if ( $Control eq 0) {
			$Control = 1;
			&dprint("$fail_string");
			$Str = $fail_string;
		}
	  }
      if ( $Control eq 1) {
			if ($SecondaryHost) {
				$TmpReturn = 'THRD';
		        $TmpReturn .= &monitor_result('error',"$Str");
				my $TmpSock = $ClientSockets{$HostIp."SYNC"};
				print $TmpSock "$TmpReturn\n";
			} else {
		        &monitor_result('error',"$Str");
			}
	  }
      select(undef,undef,undef, .000001); #Sleep for 1ms      
   }
}
###############################################################################

sub tmp_fix_sef {
   my $hcmd;
   my @pad_len;
   my $arg1;
   my $arg2;
   
   $hcmd = "03" . " " . "0005";
   $arg1 = substr(Math::BigInt->new($_[1])->as_hex, 2);
   $arg2 = substr(Math::BigInt->new($_[2])->as_hex, 2);
   switch ($arg1) {
      case 0 { push @pad_len, 2;}
      case 1 {
         switch ($arg2) {
            case 1 { push @pad_len, (6,6); }
            case 2 { push @pad_len, 12;}
         }
      }
      case 2 {
         switch ($arg2) {
            case 0 {push @pad_len, 2;}
            case 1 {push @pad_len, (6,6,2);}
            case 2 {push @pad_len, (12,2);}
         }
      }
   }
   if ($_[1] == 0) {
      $hcmd .= " " . $_[1];
   }
   else {
      $hcmd .= " " . $arg1 . " " . $arg2;
      foreach $arg (@_[3..$#_])
      {
         if ($arg =~/ACL_HDL/ || $arg =~ /BD_ADDR/ || $arg =~/SCO_HDL/ || $arg =~ /LE_HDL/)
                        {
                                $hcmd .= " " . $arg;
                        }
         else {
	        $arg = substr(Math::BigInt->new($arg)->as_hex, 2);
                my $pad = shift @pad_len;
                my $t1 = &Little_Endian(sprintf ("%0${pad}s", $arg));
                $hcmd .= " " . $t1;
	      }	
      }
   }
return $hcmd;
}
###############################################################################

sub Stop_Data_Stream { #<device> ; This fucntion will stop all data streams
                                    #running on device
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~test 1";
		print  $TmpSock "$data\n";
	} else {
	    my $handle = "Q_". $_[0];
		print $handle "test 1\n";
	}

   return 0;
}

###############################################################################
sub tmp_fix_write_LAP {
   my $arg;
   my $hcmd;
   my $t1;
   
   $hcmd = "03" . " " . "003A";
   $hcmd .= " " . $_[1];
   foreach $arg (@_[2..$#_])
   {
      $arg = substr(Math::BigInt->new($arg)->as_hex, 2);
      $t1 = &Little_Endian(sprintf ("%0${6}s", $arg));
      $hcmd .= " " . $t1;
   }
   return $hcmd;
}
###############################################################################

sub Send_Broadcast_Data { #<device> <bytes>
   my $handle = "Q_". $_[0];
   my $bytes = $_[1];
   
   print $handle "bsend $bytes\n";
   return 0;
}
###############################################################################

sub Acldat {#<dev1> <dev2> <l2cap CID> <packet size> <count> <interval> <pattern> <bdaddr>
   my $cid = $_[2];
   my $size = $_[3];
   my $count = $_[4];
   my $interval = $_[5];
   my $pattern = $_[6];
   my $bd_addr = $_[7];
   my $port = $DEVICE{$_[0]."port"};
   
   if($HTOOL) {
         if ($bd_addr =~ /BD_ADDR/) {
         $bd_addr = $DEVICE{$_[1]."bd"};
         $bd_addr =~ s/(..)/$1:/g;
         $bd_addr =~ chop $bd_addr;
      }
      if ($handle =~ /ACL_HDL/) {
         $handle = ($LINK{"ACL".$_[0].$_[1]});      
      }
      $hcmd = "$HCITOOL $port acldat -d $cid -s $size -c $count -e $interval -P $pattern  $bd_addr";
      print $hcmd;
      &dosystem($hcmd);
      return 0;
   }
   else {
      print "\n Result => Script Error\n";
      &monitor_result("abort_script", " \$HTOOL not enabled");
   }
   
}
###############################################################################

sub Acldat_perf { #<dev> <cid><size><pattern><interval><duration>
				  #RETURN:Throughput, Max_PER, Average_PER

   my $cid = $_[1];
   my $size = $_[2];
   my $pattern = $_[3];
   my $interval = $_[4];
   my $duration = $_[5];
   my $port = $DEVICE{$_[0]."port"};
   my $now;
   my $FH;
   my $samples = $duration/$interval;
   my $count = 1;
   my @pktrcv;
   my @per;
   my $tot_pkt = 0;
   my $tp =0;
   my $max_per;
   my @perf_results;
   
   if ($HTOOL) {
      $now = time();
      my $tmplog = $LOG . $TEST_NAME . "hcidumptmp_" .$_[0]. $now;
      $hcmd = "$HCILOG $port -E receiver -d $cid -s $size -P $pattern -e $interval >$tmplog";
      print "\n$hcmd";
      dosystem($hcmd);
      sleep $duration;
      open ($FH, $tmplog) || die "Unable to open $tmplog :$!";
      while ($count <= $samples ) {
         $line = <$FH>;
         if ($line =~ m/Receive count = (\d+) \((\d+)\),.*, PER = (\d+)/) {
            push @pktrcv, $1;
            push @per, $3;
            $count++;
         }
      }
      #Throughput Calculation
      $tot_pkt += $_ for @pktrcv;
      $tp = (($tot_pkt * $size) * 0.008)/($duration);
      printf("\nThroughput=>%f kbps", $tp);
      push @perf_results, $tp;
      
      #Max PER
      $max_per = $per[0];
      $_ > $max_per and $max_per = $_ for @per;
      print "\nMaxPER=>$max_per";
      push @perf_results, $max_per;
      
      #Average PER
      my $tot_per += $_ for @per;
      print "\nAverage PER=>", $tot_per/$samples,"\n";
      push @perf_results, $tot_per/$samples;
      dosystem("cat $tmplog");
      
      return @perf_results
   }
   else {
      print "\n Result => Script Error\n";
      &monitor_result("abort_script", " \$HTOOL not enabled");
   }
}
###############################################################################

# For LE Advertisement
sub LE_ADV { #<device1><device2> <adv_min_int> <adv_max_int> <adv_type> <ch_map> <adv_filter_policy>
my $dev = $_[0];
my $ref = $_[1];
my $min = $_[2];
my $max = $_[3];
my $typ = $_[4];
my $map = $_[5];
my $fip = $_[6];
my $addr_typ = $_[7] || 0;
use bigint;

&Send_Link_CMD($dev, $ref, LE_Set_Advertising_Parameters, $min, $max, $typ, 0x00, 0x00, BD_ADDR, $map, $fip);
&Wait_For($dev, Command_Complete_Event, NA, LE_Set_Advertising_Parameters, 0x00, 2);

&Send_CMD($dev, LE_Set_Advertising_Data, 0x0a, 0x1111111111111111111111);
&Wait_For($dev, Command_Complete_Event, NA, LE_Set_Advertising_Data, 0x00, 1);

&Send_CMD($dev, LE_Set_Scan_Response_Data, 0x1f, 0x1a2a3a4a5a1a2a3a4a5a1a2a3a4a5a1a2a3a4a5a1a2a3a4a5a1a2a3a4a5a0a);
&Wait_For($dev, Command_Complete_Event, NA, LE_Set_Scan_Response_Data, 0x00, 1);

&Send_CMD($dev, LE_Set_Advertising_Enable, 0x01);
&Wait_For($dev, Command_Complete_Event, NA, LE_Set_Advertising_Enable, 0x00, 1);

return 0;
}
###############################################################################

sub SEM {
   use bigint;
&Send_CMD(ref1, Set_Event_Mask, 0x2fffffffffffffff);
&Wait_For(ref1, Command_Complete_Event, NA, Set_Event_Mask, 0x00, 2);
}
###############################################################################

sub Disc_LE # <$dev1> <$dev2> <$reason>
{
   my $handle = "Q_" . $_[0];
   my $dis_res = $_[2];
   my $cmd;
   my $hcmd;
   my $acl_hdl;
   my $result=0;
   my $port =  $DEVICE{$_[0]."port"};
   my $flag = 'LINK';
   my $DeviceStr;

   &Send_Link_CMD($_[0],$_[1], Disconnect, $_[2], $_[3]);
   if ($_[3] == 0x13) {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, 0x16, 23);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, 0x13, 23);
   }
   else {
      &Wait_For($_[0], Disconnection_Complete_Event, 0x00, NA, NA, 23);
      &Wait_For($_[1], Disconnection_Complete_Event, 0x00, NA, NA, 23);
   }
   
   # DiscConnection Handle Stuff

   $LINK{"LE".$_[0].$_[1]} = NULL;
   $LINK{"LE".$_[1].$_[0]} = NULL;

   	$RemoteIP = &Fetch_IP($_[0]);
	if ( ($RemoteDeviceFlag || $SecondaryHost) && $ClientSockets{$RemoteIP."SYNC"} ) {
		foreach $TmpKey (keys %LINK) {
			if( $TmpKey =~ m/dut/ || $TmpKey =~ m/ref/ ) {
				push(@DeviceArry, $TmpKey);
				$DeviceStr .= "$TmpKey:$LINK{$TmpKey}:";
			}
		}
		$TmpSock = $ClientSockets{$RemoteIP."SYNC"};
		$DeviceStr .= $flag;	
		print $TmpSock "$DeviceStr\n";
	}

   return $result;
}
###############################################################################

#Function for putting controller in Sleep mode
sub Sleep_mode {	 #<$dev1> <time>
   my $dut = $DEVICE{$_[0]."port"}; 
   my $time = $_[1];

   #Clearing dmesg and log file
   &Send_System_CMD(dut,"dmesg -c");
   open $file_handle, ">dmesg.log" or die $!;
   close $filehandle;

   # Enable dmesg log
   &Send_System_CMD(dut,"echo drvdbg=0xffffffff > /proc/mbt/$dut/config");

   # Enabling hsmode
   &dprint ("==========================Enable HS Mode=======================\n");
   sleep 3;
   #Configure GPIO 4 for WoBT using the command: 
   &Send_System_CMD(dut,"echo gpio_gap=$time > /proc/mbt/$dut/config");
   #Set the host sleep Config using the below cmd
   &Send_System_CMD(dut,"echo hscfgcmd=1 > /proc/mbt/$dut/config");
   #Activate the Host SleeMode(hsmode) using the below two commands.
   &Send_System_CMD(dut,"echo hsmode=1 > /proc/mbt/$dut/config");
   &Send_System_CMD(dut,"echo hscmd=1 > /proc/mbt/$dut/config");
}
###############################################################################

#Function for system command
sub Send_System_CMD # <$dev1> <$command>
{
   my $handle = "Q_" . $_[0];
   my $cmd = $_[1];
   my $hcmd;
 
   &dprint(" > Command on $_[0] - $cmd\n");
   
       $port =  $DEVICE{$_[0]."port"};
        $hcmd = "$port cmd $cmd\n"; 
        &dosystem($cmd);
  
}
###############################################################################

sub GetTimeDifference_old { #<Start Time> <End Time> this function returns the time difference in secs.
	$StartSec = $_[0];	#Secs = $_[0]/$_[9]; Mins = $_[1]/$_[10]; Hrs = $_[2]/$_[11]; No. of Days in year = $_[7]/$_[16]
	$StartMinsInSec = $_[1] * 60;
	$StartHrInSec = $_[2] * 60 * 60;
	$StartDaysInSec = ($_[7] + 1) * 24 * 60 * 60;
	$StartTotalSec = $StartSec + $StartMinsInSec + $StartHrInSec + $StartDaysInSec;

	$EndSec = $_[9];
	$EndMinsInSec = $_[10] * 60;
	$EndHrInSec = $_[11] * 60 * 60;
	if ( $_[16] < $_[7] )	{
		if ($_[5] % 4 == 0 ) {
			$_[16] += 366;
		} else {
			$_[16] += 365;	
		}
	}
	$EndDaysInSec = ( $_[16] + 1 ) * 24 * 60 * 60;
	$EndTotalSec = $EndSec + $EndMinsInSec + $EndHrInSec + $EndDaysInSec;

	#print "Time Difference : ".($EndTotalSec-$StartTotalSec)." secs\n";
	return ($EndTotalSec-$StartTotalSec);

}
###############################################################################
sub GetTimeDifference { #<Start time> < End Time>
	my $elapsed = tv_interval ($_[0], $_[1]);
	#print "-- >> $elapsed\n\n";
	return($elapsed);
}
###############################################################
sub Send_Data_interval{	 #<from_dev> <to_dev> <bytes> <ACL_HDL> <Interval> <data_integrity_check_enable/disable>
			 #Interval should be in Milli sec eg: 30ms = 30; 1sec 10ms = 1010.

   my $handle = "Q_". $_[0];
   my $fhandle = "L_". $_[1];
   my $bytes = $_[2];
   my $ref_dev = $_[1];
   my $interval = $_[4];
   my $start_pos;
   
   if ($_[3] eq "ACL_HDL") {
      $hdl = hex ($LINK{"ACL".$_[0].$_[1]});
   }
   elsif ($_[3] eq "SCO_HDL") {
      $hdl = hex ($LINK{"SCO".$_[0].$_[1]});
   }
   elsif ($_[3] eq "LE_HDL") {
      $hdl = hex ($LINK{"LE".$_[0].$_[1]});
   }
   else {
      $hdl = hex ($_[3]);
   }

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~isend $bytes $interval $hdl";
		print  $TmpSock "$data\n";
	} else {
		print $handle "isend $bytes $interval $hdl\n";
	}
   $start_pos = tell $fhandle;
   if ($_[5]) {
      threads->create(\&Check_Data_Integrity, $ref_dev, $start_pos)->detach();
   }
   return 0;

}
###############################################################
sub Stop_Data_interval{	#<from_dev> <to_dev> <ACL_HDL/SCO_HDL>

   my $handle = "Q_". $_[0];
   my $handle1 = "Q_". $_[1];

   if ($_[2] eq "ACL_HDL") {
      $hdl = hex ($LINK{"ACL".$_[0].$_[1]});
      $hdl1 = hex ($LINK{"ACL".$_[1].$_[0]});
   }
   elsif ($_[2] eq "SCO_HDL") {
      $hdl = hex ($LINK{"SCO".$_[0].$_[1]});
      $hdl1 = hex ($LINK{"SCO".$_[1].$_[0]});
   }
   elsif ($_[2] eq "LE_HDL") {
      $hdl = hex ($LINK{"LE".$_[0].$_[1]});
      $hdl1 = hex ($LINK{"LE".$_[1].$_[0]});
   }
   else {
      $hdl = hex ($_[1]);
      $hdl1 = hex ($_[1]);
   }
   
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~istop $hdl";
		print  $TmpSock "$data\n";
		$data = "$_[0]~CMD~istop $hdl1";
		print  $TmpSock "$data\n";
	} else {
		print $handle "istop $hdl\n";
		print $handle1 "istop $hdl1\n";
	}
   return 0;
}

############################################################
sub SCO_Send_File
{
	my $handle = "Q_". $_[0];
    $hdl = hex ($LINK{"SCO".$_[0].$_[1]});

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~scosend $hdl $_[2] $_[3]";
		print  $TmpSock "$data\n";
	} else {
		print $handle "scosend $hdl $_[2] $_[3]\n";
	}
}
############################################################
sub SCO_Rec_File_Start
{
	my $handle = "Q_". $_[0];
	my $DevicePort = $DEVICE{$_[0]."port"};

	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~scorecord $_[1] 1";
		print  $TmpSock "$data\n";
	} else {
		if (!$HTOOL) {
			print $handle "scorecord $_[1] 1\n";
		} else {
			system("chmod +x $ScoApp");
			open( $ScoHandle, "| $ScoApp $DevicePort") || die "Unable to open ScoApp to Record Audio..\n";
			print $ScoHandle "scorecord $_[1] 1\n";
		}
	}
}

############################################################
sub SCO_Rec_File_Stop
{
	my $handle = "Q_". $_[0];
	if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		$data = "$_[0]~CMD~scorecord $_[1] 0";
		print  $TmpSock "$data\n";
	} else {
		if (!$HTOOL) {
			print $handle "scorecord $_[1] 0\n";
		} else {
			print $ScoHandle "scorecord $_[1] 0\n";
			print $ScoHandle "quit\n";
		}
	}
}
############################################################

sub Send_System_CMD_Handler # <$dev1> <$command> <$background><$outputfile>
{
   my $cmd = $_[1];
   my $background = $_[2];
   my $outputfile = $_[3] || 1;
   # If background flag is 1 then run the command in backgound
   # Else If background flag is 0 then wait for command to complete
   my @parms = @_[1..$#_];
   my $result;
   my $TmpStr;

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		print "In Secondary....\n\n";
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Send_System_CMD_Handler~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		if ( $SocketEvents[1] =~ /PASS/ ) {
			$result = 0;
			return $result;
		} else {
			&dprint ("\n$SocketEvents[2]");
   	        &monitor_result($SocketEvents[1], $SocketEvents[2]);
		}
   }

  	print "Local System .... \n\n";
  	if ($background == '1') {
            if ($outputfile == '1') {
                  # If no output file is mentioned then cut the STDOUT and simply run the command in background
                  &dprint(" 2 \n");
                  &dprint(" > Command on $_[0] - $cmd > /dev/null &\n");
                  $result = capture("$cmd > /dev/null &");
                  
            } else {
                  # Run the command in background and redirect the output to a file
                  &dprint(" 1 \n");
                  &dprint(" > Command on $_[0] - $cmd > $outputfile &\n");
                  $result = capture("$cmd > $outputfile &");
            }
   	} else {
        # Simply run the command and get the output
        &dprint(" > Command on $_[0] - $cmd \n");
      	#$result = capture("$cmd");
	  	$result = system("$cmd");
   	}
   if ($result != NULL) {
         &dprint("===========================\n$result ===========================\n");
   }
   return 0;
}

############################################################
sub Wait_For_Events { #<dev> <timeout>

	my $ldev = $_[0];
   	my $file_handle = "L_" . $_[0];
    my $timeout = $_[$#_];
  	my $exit = 1;
    my @result = undef;

   	my $event_id;
   	my @l;
   	my $next_line;
   	my $i;
   	my(@bits);
   	my $inq_dev=0;
   	my $bd_address = "NA";
    my $TmpStr;

   if ( $_[0] ~~ @RemoteInterface && !$SecondaryHost ) {
		foreach( @_ ) {
			$TmpStr .= $_.',';
		}
		$TmpStr =~ s/,$//;

		$data = "$_[0]~RES~Wait_For~$TmpStr";
		$RemoteIP = &Fetch_IP($_[0]);
		$TmpSock = $ClientSockets{$RemoteIP};
		print  $TmpSock "$data\n";
		
		$data = &readSock($TmpSock, $timeout, $expect_event[0], $ldev);
		print "-->> $data\n";

		@SocketEvents = split(/~/, $data);
		@result = split(/\s/, $SocketEvents[1]);

		return @result;
   }

   	$timeout = Math::BigFloat->new($timeout*1000);
   	Math::BigFloat->accuracy(5);	
    
   	do {
    	my $start= tell $file_handle;
      	$next_line = <$file_handle>;
      	$timeout--;
      	if ($next_line eq "") {
        	select(undef, undef, undef, 0.001);
			if ($timeout < 0) {
				$exit = 0;
			}
      	} else {
         	while ($next_line !~ /\n/) {
            	seek $file_handle, $start, 0;
            	$next_line = <$file_handle>;
         	}
         	if ( $next_line =~ m/> (.*)/ ) {
				push(@result, $next_line);
		 	}
		}
   	} while $exit;
   	return @result;
}
############################################################
sub Measure_MOS_pesq { # <Orginal File>

	my $MOSTOOL = "Mrvl_Tool/pesq";
	my $ORIGFILE = $_[0];
	my $DEGFILE = $_[1];
	my $pesqCmd = "";
	my $WBS = $_[2];
	my $MOSFILE = "mos_results.txt";
	my $mos = 0;
	my $TmpDestFile = $DEGFILE;

	print "-->$DEGFILE\n";
	rename($DEGFILE, 'logs/Output.wav');
	$DEGFILE = 'logs/Output.wav';

	#Assiging executable permission for pesq tool	
	system("chmod +x $MOSTOOL");

    if ( -e $MOSFILE) {
        print "rm $MOSFILE\n" ;
        unlink "$MOSFILE" || die "\n\nERROR: Could not remove $MOSFILE.\n$!\n" ;
    }

    if ($WBS) {
        $pesqCmd = ("./$MOSTOOL +16000 " . $ORIGFILE . " " . $DEGFILE  );
    } else {
        $pesqCmd = ("./$MOSTOOL +8000 " . $ORIGFILE . " " . $DEGFILE  );
    }

    print "$pesqCmd\n";
    system ($pesqCmd);
    
    open (FH, $MOSFILE) || die "Failed to open $MOSFILE";
    while(my $line = <FH>) {
        $line = <FH>;
        my @score = split(/\s+/, $line);
        $mos = $score[3];
        print "\nMOS Score = $mos\n\n";
    }

    if ( -e $MOSFILE) {
        print "rm $MOSFILE\n" ;
        unlink "$MOSFILE";
    }

	rename($DEGFILE, $TmpDestFile);
	$DEGFILE = $TmpDestFile;
	print "\n-------------------------------\n";
	print "Recored Audio File Path: $DEGFILE\n";
	print "-------------------------------\n\n";

    return $mos;
}

############################################################
sub AudioInit {
	my $ControlFalg = $_[0]; # 1: Initialize, 0: Cleanup
	my $TmpDestFile = $_[1];
	my $TmpTestName = $TEST_NAME;
	$TmpTestName =~ s/\.pl//;

	if ($ControlFalg) {
		&dosystem("killall aplay"); 
		&dosystem("killall arecord"); 

		if ($TmpDestFile) {
			&dosystem("rm -f $TmpDestFile");
			&Send_System_CMD_Handler(dut, "ls $TmpDestFile", 0);
		} else {
			$TmpDestFile = $LOG . $TmpTestName . "_Recorded_File.wav"
		}
	} elsif (!$ControlFalg) {
		&dosystem("killall aplay"); 
		&dosystem("killall arecord"); 
	}
	
	return $TmpDestFile;
}

############################################################
sub Play_Audio { #<Source Audio File>
	my $TmpSrc = $_[0];
	my $Return;
	system("chmod +x Mrvl_Tool/aplay");

	my $command = "/usr/bin/aplay $TmpSrc";
	$Return = &Send_System_CMD_Handler(dut, $command, 1);

	return $Return;
}

############################################################
sub Record_Audio { #<Channel><Rate><Format><File Type><Duration><Destination File>
	
	my $TmpChannel = $_[0];
	my $TmpRate = $_[1];
	my $TmpFormat = $_[2];
	my $TmpFileType = $_[3];
	my $TmpDuration = $_[4];
	my $TmpDest = $_[5];
	my $Return;
	system("chmod +x Mrvl_Tool/arecord");

	my $command = "/usr/bin/arecord -c $TmpChannel -r $TmpRate -f $TmpFormat -t $TmpFileType -d $TmpDuration $TmpDest";
	$Return = &Send_System_CMD_Handler(dut, $command, 1); 

	return $Return;
}


########################################################
# Function related to NFC adre added by - Nandita Nath
#########################################################
#Function for send NFC command to DUT

sub Send_NFC_CMD # <$dev1> <$command>
{

	my $ldev = $_[0];
	my $handle = "Q_" . $_[0];
	my $fhandle = "N_" . $_[0];
	my $cmd = $_[1];
	my $hcmd;
	my $start;
	my $c_string;
 
	my @parms = @_[1..$#_];
	#$hcmd = &Build_NFC_Cmd(@parms);
	($hcmd, $c_string ) = &Build_NFC_Cmd(@parms);
   
	&dprint(" > Command on $_[0] - $cmd \n $c_string \n");
	#&dprint(" > Command on $_[0] - $hcmd\n");   
  
	if ($HTOOL) {
		$port =  $DEVICE{$_[0]."port"};
		$hcmd = "$HCITOOL $port cmd $hcmd";
		&dosystem($hcmd);
      
	} else {
		print $handle "gcmd $hcmd\n";
	}
 
	return 0;
}

############################################################
#Function for Wait for NFC events on DUT

sub Wait_For_NFC # <device> <Event_Name> <Params> <Timeout in sec>
{

	my $ldev = $_[0];
	my $file_handle = "N_" . $_[0];
	my @expect_event = @_[1..($#_ -1)];
	my $timeout = $_[$#_];
	my $exit = 1;
	my $result = 1; # 1=fail, 0=success
	my $event_id;
	my @l;
	my $next_line;
	my $i;
	my(@bits);
	my $inq_dev=0;
	my $bd_address = "NA";
	my $data = "";
     
	$timeout = Math::BigFloat->new($timeout*1000);
	Math::BigFloat->accuracy(5);	

   #&dprint("--> Waiting for event:$_[1] on $_[0]\n");
	foreach $item (@expect_event)
	{
		if ($item =~ /BD_ADDR_(.*)/) {
			$bd_address = $item;     # storing the BD Address to avoid conversion to hex multiple times due to recursion.
			$item = $DEVICE{$1.'bd'};
		}   
		elsif ($item =~ /COD_(.*)/) {
			$item = $DEVICE{$1.'cod'};
		}
		elsif ($item =~ /ACL_HDL_(.*)/) {
			$item = $LINK{"ACL".$_[0].$1};
		}
		elsif ($item =~ /SCO_HDL_(.*)/) {
			$item = $LINK{"SCO".$_[0].$1};
		}
		elsif ($item =~ /LE_HDL_(.*)/) {
			$item = $LINK{"LE".$_[0].$1};
		}
		elsif ($item =~ /^\d+$/) {
		$item = substr(Math::BigInt->new($item)->as_hex, 2);
		}
	}   
    #&dprint ("===== Checking log $file_handle\n");
	do
	{
		my $start= tell $file_handle;
		$next_line = <$file_handle>;
		if ($next_line eq "") {
		#This If clause is added for the NFC tag Emulation by Nandita
			if($tag_deactivate eq "true" and $data_complete eq "true") # For tag Emulation, Data writing complete and card deactivated after removing the Tag.
			{
				
				print "the Tag deactive is: $tag_deactivate\n";

				print "the data complete is: $data_complete\n";
								
				#print "@expect_event \n\n";
				#&dprint("\n Card Deactivated for SNFC_HCI_CMD_ANY_SET_PARAMETER");
                		&monitor_result('end_test', "Event $expect_event[5] for SNFC_HCI_CMD_ANY_SET_PARAMETER on $_[0]");
				$exit = 0;
            	return $result;
			} else {
				$timeout--;
				select(undef, undef, undef, 0.001);
				if ($timeout < 0)
				{
					if ($expect_event[0] =~ /Command_Status_Event/) {
						&dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
						&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
					}
					elsif ($expect_event[0] =~ /Command_Complete_Event/) {
						&dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
						&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
					} else {
						# The Case for NFC is added to catch tag detection error by Nandita
						if ($lastCmd eq "SNFC_EVT_READER_REQUESTED")
						{
							
							if ($ongoingTest eq "P2PI")
							{
								if ($NegTest eq "true")
								{
									&P2PI_Release(dut, $P2PI_pipe);
									&monitor_result('error', "P2P target detection failed");
								}
								else
								{	
									&monitor_result('error', "P2P target detection failed");
								}
								
							}
							else
							{
								if ($NegTest eq "true")
								{
								&monitor_result('end_test', "Tag Detection failed");
								}
								else
								{	
								&monitor_result('error', "Tag Detection failed");
								}
							}
						} else {
							&dprint("\n Timeout Occured for $expect_event[0]");
							&monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
						}
					}
					$exit = 0;
					return $result;
				}
			}
		} else {
			while ($next_line !~ /\n/)
			{
				seek $file_handle, $start, 0;
				$next_line = <$file_handle>;
			}
			$match = 0;
			if ( $next_line =~ m/> (.*)/ )
			{
				
				($parsed_event ,$data ) = &NFC_Parse_Event($1, $ldev);
				&NFC_event_parse($next_line);
#Payal added the if loop:
				

				if ($parsed_event =~ 'Status:00') {
				&event_database($_[0], $parsed_event);
				}
				##### match the expected event with the parse event####
				(@parsed_event) = split (/-/, $parsed_event);
				$match = &Match_Event(\@expect_event, \@parsed_event);


				if ($parsed_event[0] =~ m/$expect_event[0]/ ) {
					switch ($match) {
						case 0 {
							&dprint("Expecting: @expect_event\n");
						
							if ($expect_event[0] =~ /Command_Status_Event/) {
								&dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
								&monitor_result('error', "Mismatch For Event $expect_event[0] for $expect_event[3] on $_[0]");
							}
							#elsif ($expect_event[0] =~ /Command_Complete_Event/) {
							elsif ($expect_event[0] =~ /Vendor_Specific_Event/) {
							$parsed_event[5] = substr $parsed_event[5], 20;

								&dprint ("\n Mismatch For Event $expect_event[0] for $expect_event[5] on $_[0]");
								&monitor_result('error', "Received event: $parsed_event[5] mismatch For $expect_event[0] on $_[0] ");
							}
							elsif ($expect_event[0] =~ /LE_Meta_Event/) {
								if($timeout < 0){
									&monitor_result('Timeout', "For Event $expect_event[0] for $expect_event[3] on $_[0]");
								}
								$timeout--;
								$timeout = $timeout->copy()->bdiv(1000);
								$expect_event[5] = $bd_address;
								&Wait_For_NFC($ldev,@expect_event, $timeout);  # Recursion, wait for all the parameters in LE_Meta event to match
							} else {
								&dprint ("\n Mismatch For Event $expect_event[0] on $_[0]");
								&monitor_result('error', "Mismatch For Event $expect_event[0] on $_[0]");
							}
							return $result;
						}
						case 1 {
							# This part of code is added for NFC validation by Nandita Nath
							if ($lastCmd eq "SNFC_WR_XCHG_DATA" and ( $tagtype eq "01" or $tagtype eq "02" or $tagtype eq "03" or $tagtype eq "04"))
							{


								&dprint("The Actual data returned from Type$tagtype is: $data_to_read\n");
								&dprint("The Expected data to be returned from Type$tagtype is: $expected_data\n");
								if($read_complete_flag == 1 and $expected_data ne "")
								{
									if($data_to_read eq $expected_data)
									{
										
										&dprint("The Expected data to be returned from Type$tagtype is inside: $expected_data\n");
										$expected_data = "";
										$result = 0;  
										$exit = 0;
									} else {
										&monitor_result('error', "Returned Data from tagType$tagtype didnot match with expected");
										$exit = 0;
										$result=0;
									}
								} else {
									$result = 0;  
									$exit = 0;
								}
							} else {
								$result = 0;  
								$exit = 0;
							}
						}
                        case 2 {
							$timeout--;
							select(undef, undef, undef, 0.001);
							if ($timeout < 0) {
								if ($expect_event[0] =~ /Command_Status_Event/) {
									&dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[3] on $_[0]");
									&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[3] on $_[0]");
								}
								elsif ($expect_event[0] =~ /Command_Complete_Event/) {
									&dprint ("\n Timeout Occured for $expect_event[0] for $expect_event[2] on $_[0]");
									&monitor_result('timeout', "Timeout For Event $expect_event[0] for $expect_event[2] on $_[0]");
								} else {
									&dprint("\n Timeout Occured for $expect_event[0]");
									&monitor_result('timeout', "Timeout For Event $expect_event[0] on $_[0]");
								}
								$exit = 0;
								return $result;
							}
						}
					}
				}




			}
		}
	} while $exit;
	return $result;
}


#########################################################
# Function to Initialize NFC
#########################################################
sub Init_NFC #Parameters -$_[0], Initialization Require, One Time Config true/false
{
	use bigint;
	my $NFClogfile = $LOG . $TEST_NAME . "_NFC_" . $_[0] . ".log";
	&Open_Reading_NFC_Log($_[0], $DEVICE{$_[0]."port"}, $NFClogfile);
	my $OPEN_PIPE = 0x80;
	my $init_req = $_[1];
	my $one_time_config_req = $_[2];
	my $Open_Reader_Pipe = $_[3];
	my $data_rate = $_[4];
	my $tag_type = $_[5];
	my $test_type = $_[6];
	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}

	if ($init_req == 1) # Initialization of NFC require
	{

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_OPEN_PIPE,0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_CLEAR_ALL_PIPE,0x01, 0xFFFF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_OPEN_PIPE, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x01, 0x030002);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x050005);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_OPEN_PIPE, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		 
		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ANY_GET_PARAMETER, 0x02, 0x06);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);		

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x040004);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0xF000F0);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0xF200F2);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0xF300F3);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x130013);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x170017);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x140014);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x110011);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x180018);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x300030);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x230023);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x240024);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x310031);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x260026);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x210021);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x220022);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ADM_CREATE_PIPE, 0x01, 0x160016);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x13);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x0506);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010000000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,0x13, 0x020000000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	
} else {
		#No Initialization
	}
	if($one_time_config_req ==1 ) # One time configuration
	{
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x07);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x07, 0x0100);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x09);

		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x09, 0x0201);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x04); # tag Management pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x0D); # NFC A Card Emu Pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x0E); # NFC F Card Emu Pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x11); # NFC B Card Emu Pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x0C); # P2PI Pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x0F); # P2PT Pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	} 
	elsif($one_time_config_req == 2 and $NegTest  eq "false") # One time configuration
	{
		#&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010000000000);
		#&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		#&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x020000000000);
		#&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		if ($tag_type == 3)
		{
			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Reader_Pipe, 0x0201);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		elsif($tag_type == 4)
		{
			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Reader_Pipe, 0x0100);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		elsif($tag_type == 2 or $tag_type == 1)
		{
			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Reader_Pipe, $data_rate);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		else
		{
			#No command
		}
		
		
	}
	else {
		#Not One time configuration. Config every time.
	}

}


#########################################################
# Function to Configure NFC Pipes and data rates
#########################################################
sub Config_NFC
{
	use bigint;
	my $Open_Reader_Pipe = $_[1];
	my $data_rate = $_[2];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag = $_[3];
	my $indivitual_config = $_[4];
	my $test_type = $_[5];
	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}

	if($type_of_tag ==2 or $type_of_tag ==1 or $type_of_tag ==4)
	{
		if($indivitual_config == 0) # Indivitual configuration
		{
			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, $Open_Reader_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Reader_Pipe, $data_rate);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010000000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x020100000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}
	if($type_of_tag ==3)
	{
		if($indivitual_config == 0) # Indivitual configuration
		{
			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, $Open_Reader_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Reader_Pipe, $data_rate);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010200000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x020100000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}

}



#########################################################
# Function to Detect Tags
#########################################################
sub Detect_Tag
{
	use bigint;
	my $Open_Reader_Pipe = $_[1];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag = $_[2];
	my $test_type = $_[3];
	if ($test_type == 1)
	{
		$NegTest = "true";

	}
	else
	{
		$NegTest = "false";
	}
	if($type_of_tag == 1)# For Type1 tag
	{
		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED,  $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,25);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  $Open_Reader_Pipe, 0x04);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  $Open_Reader_Pipe, 0x11);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  $Open_Reader_Pipe, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	}
	elsif($type_of_tag == 2)
	{

		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,25);
		sleep 4;
	
	
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER, $Open_Reader_Pipe, 0x04);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);


		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER, $Open_Reader_Pipe, 0x03);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}
	elsif($type_of_tag == 3)
	{
		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,25);

		# Commands for reading address of Tag3

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER, $Open_Reader_Pipe, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}
	elsif($type_of_tag == 4)
	{
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010000000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x13, 0x020100000000);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,15);

		# Commands for reading address from tag4

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  $Open_Reader_Pipe, 0x04);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  $Open_Reader_Pipe, 0x03);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}
	else
	{
		$generic_detect =1;
		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, 0x07);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,5);

		&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, 0x09);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,5);
	}
}



#########################################################
# Function to Read Tags
#########################################################
sub Read_Tag
{
	use bigint;
	my $Open_Reader_Pipe = $_[1];
	my $expected_data = $_[2];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag =$_[3];
	my $test_type = $_[4];

	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}
			
	if($type_of_tag == 2)# For Type 2 tag
	{
our $Open_Reader_Pipe_1 = $Open_Reader_Pipe;

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,$Open_Reader_Pipe, 0x0203003000); # 3 bytes of data and first byte represents tag type and 2nd byte length of data.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		# In between commmnds will be generated based on memory of Tag

		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		
		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";
		# Commands for End Operation.
		&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
sleep 5;  
		
	}
	elsif($type_of_tag == 1)# For Type1 tag
	{
		
# Commands for Reading data from tag1 (RALL Command)
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "01080000000000000000"); # 8 bytes of data and first byte represents tag type and second byte the length of data.
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	sleep 5;	
# Commands for End Operation.


# Commands for End Operation.
		&Send_NFC_CMD($_[0],SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);		


		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";
	}
	elsif($type_of_tag == 3)# For Type3 tag
	{
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA, $Open_Reader_Pipe, "031600060000000000000000010B00018000"); # 16 bytes of data and first byte represents tag type and the 2nd byte the length of data.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);;

		&build_type3_read_cmd("031600060000000000000000010b0000");

		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		# Commands for End Operation.

		&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";
	}
	elsif($type_of_tag == 4)
	{
	
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04141E00A4040007D276000085010100");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04081E00A4000C02E103");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B000000F");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);;


		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04081E00A4000C02E104");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B0000002");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B0000032");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		# In between commands will be generated based on memory available.

		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
		$readdata = "";
		$tagtype = "";

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_PRESENCE_CHECK,  $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
		$Type4MsgExecCount =0;
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";


	} else { }
}

##################################################################################################################
sub Read_Tag_Emulation
{
	use bigint;
	my $Open_Reader_Pipe = $_[1];
	my $expected_data = $_[2];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag =$_[3];
	my $test_type = $_[4];
	our $Open_Reader_Pipe_1 = $Open_Reader_Pipe;

	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}
			
	if($type_of_tag == 2)# For Type 2 tag
	{

our $T2_Emulation = 1;
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,$Open_Reader_Pipe, 0x0203003000); # 3 bytes of data and first byte represents tag type and 2nd byte length of data.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 25);

		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,30);
&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);


		&Send_NFC_CMD(dut,SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		
		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";


sleep 5;
		

	}
	elsif($type_of_tag == 1)# For Type1 tag
	{
		
# Commands for Reading data from tag1 (RALL Command)
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "01080000000000000000"); # 8 bytes of data and first byte represents tag type and second byte the length of data.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 25);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,25);

	sleep 5;	
# Commands for End Operation.


# Commands for End Operation.
		&Send_NFC_CMD($_[0],SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);		


		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";
	}
	elsif($type_of_tag == 3)# For Type3 tag
	{
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA, $Open_Reader_Pipe, "031600060000000000000000010B00018000"); # 16 bytes of data and first byte represents tag type and the 2nd byte the length of data.
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);;

		&build_type3_read_cmd("031600060000000000000000010b0000");

		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		# Commands for End Operation.

		&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";
	}
	elsif($type_of_tag == 4)
	{
	
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04141E00A4040007D276000085010100");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04081E00A4000C02E103");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B000000F");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);;

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04081E00A4000C02E104");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B0000002");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA,  $Open_Reader_Pipe, "04061E00B0000032");
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,25);
#		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5); # commented for tag Emulation


		# In between commands will be generated based on memory available.

		#&expected_data_read_from_tag($expected_data); # Call this function to pass the expected data to validate.
		#&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
		$readdata = "";
		$tagtype = "";

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_PRESENCE_CHECK,  $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

		$readdata = "";
		$tagtype = "";
		$Type4MsgExecCount =0;
		$read_complete_flag = 0;
		$expected_data = "";
		$data_to_read = "";


	} else { }
}
#########################################################
# Function to Write into Tags
#########################################################
sub Write_Tag

{
	use bigint;
	my $Open_Reader_Pipe = $_[1];
	my $data_to_write = $_[2];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag = $_[3];
	my $test_type = $_[4];
	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}
	
	if($type_of_tag == 1) 
	{
		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, $data_to_write); # 8 bytes of data and first byte represents tag type and 			second byte the length of data.
#&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
#&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_E_TIMEOUT",NA,5);

		# Commands for End Operation.

		&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
sleep 2;
	}
	elsif($type_of_tag == 2)
	{
			&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, $data_to_write); # 8 bytes of data and first byte represents tag type and 			second byte the length of data.
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		# Commands for End Operation.

		&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
		
	}
	elsif($type_of_tag == 3)
	{
		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x09, "031600060000000000000000010B00018000"); # 16 bytes of data and first byte 			represents tag type and the 2nd byte the length of data.
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);;

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x09, $data_to_write); # 8 bytes of data and first byte represents tag type and 			second 
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_E_TIMEOUT",NA,5);

		# Commands for End Operation.

		
		&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		$readdata = "";
		$tagtype = "";
		
	}
	elsif($type_of_tag == 4)
	{
		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, "04141E00A4040007D276000085010100");
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, "04081E00A4000C02E103");
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07,"04061E00B000000F");
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07,"04081E00A4000C02E104");
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07,"04061E00B0000002");
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, $data_to_write);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		$Type4MsgExecCount =0; # Making the command sequence execution counter 0
			
		&Wait_For_NFC(dut, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		$readdata = "";
		$tagtype = "";
		

		&Send_NFC_CMD(dut, SNFC_HCI_CMD_PRESENCE_CHECK,  $Open_Reader_Pipe);
		&Wait_For_NFC(dut,Command_Status_Event, 0x00, NA, NA, 5);
		#&Wait_For_NFC(dut,Vendor_Specific_Event, NA, NA, NA, NA, 5);

		
		&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, $Open_Reader_Pipe);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		
		
		
	}
}

#########################################################
# Function to Emulate NFC Tags
#########################################################
sub Emulate_Tag
{
	use bigint;
	my $Open_Card_Emu_Pipe = $_[1];
	my $Individual_config_req = $_[2];
	my $OPEN_PIPE = 0x80;
	my $type_of_tag = $_[3];
	my $data_rate = $_[4];
	my $test_type = $_[5];
	$Emulation_Pipe = $Open_Card_Emu_Pipe;
	if ($test_type == 1)
	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}
        

	&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x0506);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x010000000000);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x13, 0x020000000000);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	
	# Tag personality Management Pipe command
	if($Individual_config_req == 0)
	{
		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_OPEN_PIPE, 0x04);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}
	&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x01);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x02);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	if ($type_of_tag == 1)
	{
		
		if($Individual_config_req == 0)
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_OPEN_PIPE, $Open_Card_Emu_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x020A0B0C0D);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0300);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x04000C);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, $data_rate);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0681);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x05);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0A11);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0B00);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0102);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

	#	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"51",NA,5);
	#	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,5);
#print "####### Datat # \n\n";
#		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"53",NA,5);
#		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"Detect Device",NA,5);
#print "####### Datat 1# \n\n";
	}
	elsif ($type_of_tag == 2)
	{
		if($Individual_config_req == 0)
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_OPEN_PIPE, $Open_Card_Emu_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0201020304);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0300);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x040400);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, $data_rate);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0681);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x05);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0A00);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0B00);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0102);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		
	
		
	}
	elsif ($type_of_tag == 3)
	{
		print "the pipe id is: $Open_Card_Emu_Pipe\n";
		if($Individual_config_req == 0)
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_OPEN_PIPE, $Open_Card_Emu_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0403FEBEEFF1CACACA);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x050123456789ABCDEF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0612FC);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0102);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
	}
	elsif ($type_of_tag == 4)
	{
		if($Individual_config_req == 0)
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_OPEN_PIPE, $Open_Card_Emu_Pipe);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		if($Open_Card_Emu_Pipe ne 0x11) # For Type4A tag emulation
		{
			print "The NegTest is : $$NegTest\n";
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0201020304);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0320);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x040400);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, $data_rate);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x06B0);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x05);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0A00);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0B00);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0102);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}
		elsif($Open_Card_Emu_Pipe ne 0x0D) # For Type4B tag Emulation
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0201020304);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0305);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0406070880);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x05);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x06000000);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER, $Open_Card_Emu_Pipe, 0x0102);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		}

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x01);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x04, 0x02);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);

		#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
	}
}
#########################################################
# Function to Close NFC Pipes
#########################################################
sub Close_NFC #Parameters -DUT, Close flag
{
	use bigint;
	my $close_flag = $_[1];
	my $config_req = $_[2];
	my $pipe_id = $_[3];
	my $OPEN_PIPE = 0x80;
	if($close_flag == 1)
	{
		if($config_req == 1 or $config_req ==2)
		{
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x07);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			#&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x09);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			#&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x13);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
			#&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x04);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x0D);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x0E);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x11);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x0C);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		
			&Send_NFC_CMD($_[0],  SNFC_HCI_CMD_CLOSE_PIPE, 0x0F);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

		}
		elsif($config_req == 0)
		{
			&Send_NFC_CMD($_[0],SNFC_HCI_CMD_CLOSE_PIPE, $pipe_id);
			&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		}
		
	}
}

#########################################################
# Function to initialize P2PI
#########################################################
sub P2PI_Init #Parameters -DUT, 
{
	my $Open_P2PI_Pipe = $_[1];
	my $data_rate_P2PI = $_[2];
	my $data_rate_NFC = $_[3];
        my $data_rate_discovery = $_[4];
	my $test_type = $_[5];
	my $Individual_config_req = $_[6];
	$ongoingTest = "P2PI";

	my $OPEN_PIPE = 0x80;

	if ($test_type == 1)

	{
		$NegTest = "true";
	}
	else
	{
		$NegTest = "false";
	}
	if($Individual_config_req == 0)
	{
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x8C); # P2PI pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, $Open_P2PI_Pipe); #NFC pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
		
	}

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,   0x8C, 0x0700);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,   0x8C, 0x04);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	
	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,   0x8C, $data_rate_P2PI);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  $Open_P2PI_Pipe, $data_rate_NFC);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x93, $data_rate_discovery);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x93, 0x0201);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_EVT_READER_REQUESTED, $Open_P2PI_Pipe);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event, NA, NA, NA, NA,NA, 5);
	
	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_PRESENCE_CHECK,   0x8C);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event, NA, NA, NA, NA,NA, 5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_PRESENCE_CHECK,  0x8C);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event, NA, NA, NA, NA,NA, 5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_PRESENCE_CHECK,  0x8C);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event, NA, NA, NA, NA,NA, 5);

	#&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, 0x07);
	#&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);

}

#########################################################
# Function to data transfer using P2PI
#########################################################
sub P2PI_Data_Transfer #Parameters -DUT, 
{
	use bigint;
	my $OPEN_PIPE = 0x80;
	my $data = $_[1];
	my $datastring;
	my (@param)= split (/,/,$data);
	foreach my $item(@param)
	{
	
		$datastring = $item;
		print "the item is: $datastring\n";
		$datastring =~ s/(.)/sprintf("%X",ord($1))/eg;
		print "the data string before:$datastring\n";
		$datastring = "00".$datastring; # this 00 is added to parse the SNFC_WR_XCHG_DATA in build_nfc_cmd function
		my $data_len = length($datastring)/2;
		$data_len = sprintf ("%02X", $data_len);
			if (length($data_len)==1)
			{
				$data_len= "0" . $data_len;
						
			}
		$datastring = "00".$data_len.$datastring; # this length is added to parse the SNFC_WR_XCHG_DATA in build_nfc_cmd function
		print "The data string to be passed: $datastring\n";
		
		&Send_NFC_CMD($_[0], SNFC_WR_XCHG_DATA, 0x8C, $datastring);
		$lastCmd = "P2PI_".$lastCmd; # Add P2PI at the beginning to process the response for this command.
#print "###### $lastCmd #########\n\n";
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		sleep 0.5;
		&Wait_For_NFC(ref1, Vendor_Specific_Event, NA, NA, NA, NA,NA, 25);
		&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA,  0x8F, "48656C6C6F00");
		&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
		#
		&Wait_For_NFC(dut, Vendor_Specific_Event, NA, NA, NA, NA,NA, 25);
		
		#sleep 1;

	}
	
	
}

# Function to Release P2PI connection
#########################################################
sub P2PI_Release #Parameters -DUT, 
{
	my $OPEN_PIPE = 0x80;
	my $Open_P2PI_Pipe = $_[1];
	$P2PI_pipe = $Open_P2PI_Pipe;
	&Send_NFC_CMD($_[0], SNFC_EVT_END_OPERATION, $Open_P2PI_Pipe);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	
}

#########################################################
# Function to initialize P2PT
#########################################################
sub P2PT_Init #Parameters -DUT, 
{
	my $OPEN_PIPE = 0x80;
	my $Individual_config_req = $_[1];
	my $Open_P2PT_Pipe = $_[2];
	
	if ($Individual_config_req == 0)
	{
		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, 0x84); # tag Management pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

		&Send_NFC_CMD($_[0], SNFC_HCI_CMD_OPEN_PIPE, $Open_P2PT_Pipe); # P2PT pipe
		&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	}

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  $Open_P2PT_Pipe, 0x0500);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  $Open_P2PT_Pipe, 0x03);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  $Open_P2PT_Pipe, 0x0101);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);
	
	#sleep 1;

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x84, 0x01);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_GET_PARAMETER,  0x84, 0x02);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,5);

	&Send_NFC_CMD($_[0], SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x84, 0x0102FFFFFF);
	&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
	#sleep 0.5;
	&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
	#&Wait_For_NFC($_[0], Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,5);
}
#########################################################
# Function to Parse NFC Events
#########################################################


sub NFC_event_parse # Parameter-
{
	use bigint;
	my $next_line = $_[0];
	if ( $next_line =~ m/> (.*)/ )
    	{
		my $error_str = substr($next_line, 51, 2);
		#print "the next line is 1: $next_line\n";
		#print "the Error String is 1: $error_str\n";
		if ($tagtype eq "01" and $next_line =~ m/(87 80)/)
			{
				$readdata = $next_line;
				&HextoString($tagtype, $readdata); # to convert Hex string to Ascii string.
			}
		   elsif ($tagtype eq "02" and $next_line =~ m/(87 80)/)
			{
		  		my $len1= length($next_line);
				my $dataline = substr($next_line, 54, $len1);
				$readdata = $readdata . $dataline;
				$readdata =~ s/[\n\r]//g;
				$readdata = substr($readdata, 0, (length($readdata)-3));
				if(length($readdata) == 48 and $readdata =~ m/(E1 10)/) # for the first 4 blocks of data from Type2
				{
					$Type2Tagmemsize = substr($readdata, 42, 2);
					print "Calling the build write function: $Type2Tagmemsize\n";
					&build_write_cmd_type2($Type2Tagmemsize);# Calling function to build read commands for Type2
				}
#else {
#&monitor_result('end_test', "Test not Executed as Tag2 Mifare tag is present");
#}

				&HextoString($tagtype, $readdata); # to convert Hex string to Ascii string. 
			}
		   elsif ($tagtype eq "03" and $next_line =~ m/(89 80)/)
			{
		  		my $len1= length($next_line);
				if ($len1 > 142 )
				{
					$next_line = substr($next_line, 90, $len1);
				}
				elsif( $len1 <= 142 and $next_line !~m/(00 00 00 00)/)
				{
					$next_line = substr($next_line, 90, $len1);
				}
				else
				{
					$next_line = substr($next_line, 81, $len1);
				}

				$readdata = $readdata . $next_line;
				$readdata =~ s/[\n\r]//g;

				$readdata = substr($readdata, 0, (length($readdata)-3));
				if (length($readdata) == 57) # It is Attribute data
				{
					my $successStr = substr($readdata, 0, 5);
					if ($successStr eq "00 00")
					{
						$noOfBlocktoReadT3 = substr($readdata, 12, 2);
						
						$noOfBlockNDEFT3 = substr($readdata, 18, 5);
						
					}
					else
					{
                       				&monitor_result('error', "The Type3 tag read is not successful");
					}

				}
				else
				{
					&HextoString($tagtype, $readdata); # to convert Hex string to Ascii string.
				}
				$flagcmd =0;
			}
			elsif($tagtype eq "04" and $next_line =~ m/(87 80)/)
			{ 
					&HextoString($tagtype, $readdata);   # Payal Added to read the data from tag
					&readwrite_data_type4_NDEF_file($next_line);
			}
			elsif($lastCmd eq "P2PI_SNFC_WR_XCHG_DATA" and $next_line =~ m/(8C 80)/) # Generate P2PI message to send
			{
$next_line =~ s/\s//g;				#Payal added to collect the read information into an array.
$next_line  = substr $next_line ,42;
$p2p_received_data = $next_line ;
push @array_p2p_data_1,$p2p_received_data;

				#&monitor_result('error', "P2P Initiator didnot recieve data from target");
			}
			#elsif($lastCmd eq "P2PI_SNFC_WR_XCHG_DATA" and $next_line !~ m/(8C 80)/) # Generate P2PI message to send
			#{
			#	print "Error in data transfer\n";
			#	&monitor_result('error', "P2P Initiator didnot recieve data from target");
			#}
			
			elsif($next_line =~ m/(8F 50)/ and $next_line !~ m/(8F 50 00)/) # P2PT Data transfer
			{
				#print "The data is sending for P2PT\n";
$next_line =~ s/\s//g;
$next_line = substr $next_line,42;
$p2p_initiator_data = $next_line ;
push @array_p2p_data,$p2p_initiator_data;

				#sleep 0.5;
				#&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0F, "48656C6C6F00");
				#&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
				#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				$P2P_Data_complete = 1;
			}
			elsif($next_line =~ m/(04 FF)/ and $next_line =~ m/(C0 0C 04)/ and ($error_str ne "80" and  $error_str ne "50" and $error_str ne "53" and $error_str ne "54" and $error_str ne "51" and $error_str ne "52"))
			{

				
 					&handle_NFC_error($error_str, $next_line);
				
			}
			elsif($countEmu == 100)# If RF Emulation messages goes in loop
			{
				print "The count is:$countEmu\n";
				print "The emulation pipe is:$Emulation_Pipe\n";
sleep2;
				$countEmu++;	
				&Send_NFC_CMD(dut,SNFC_HCI_CMD_ANY_SET_PARAMETER, $Emulation_Pipe, 0x01FF);
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA,"SNFC_HCI_ANY_OK",NA, 5);
				
				&monitor_result('error', "Tag Emulation is not progressing. Field On/Off is going on in loop");
			}
			elsif($countP2P  == 15)
			{
				$countP2P++;
				$P2P_Data_complete = 1;
				&monitor_result('error', "P2P is not progressing. Field On/Off is going on in loop");
			}

			
			else {
				if($next_line =~ m/(8D 51)/ or $next_line =~ m/(8D 53)/ or $next_line =~ m/(8D 54)/ or $next_line =~ m/(84 50 00)/) # EVT feild On/Off for NFCA
				{
					$countEmu++;
					
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA,NA,NA, 5); # Payal : ref1 is used (instead dut)for Emulation on single machine.

					
				}
				elsif($next_line =~ m/(8E 51)/ or $next_line =~ m/(8E 53)/ or $next_line =~ m/(8E 54)/) # EVT feild On/Off for NFCF
				{
					$countEmu++;
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA,NA,NA, 5); # Payal : ref1 is used (instead dut)for Emulation on single machine.
				}
				elsif($next_line =~ m/(8F 51)/ or $next_line =~ m/(8F 53)/ or $next_line =~ m/(8F 54)/ or $next_line =~ m/(8F 52)/) # EVT feild On/Off for P2PT
				{
					print" It is here:$P2P_Data_complete\n";
					$countP2P++;
					if ($P2P_Data_complete != 1)
					{
					&Wait_For_NFC(ref1, Vendor_Specific_Event, NA, NA, NA, NA,NA, 10);
					}
				}
				elsif($next_line =~ m/(91 51)/ or $next_line =~ m/(91 53)/ or $next_line =~ m/(91 54)/) # EVT feild On/Off for NFCB

				{
					$countEmu++;
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA,NA,NA, 5); # Payal : ref1 is used (instead dut)for Emulation on single machine.
				}
				elsif($next_line =~ m/(8D 50 00 00 00 0A 0B 0C 0D 00)/) # Type1 Tag ready to write data during Tag emulation
				{



					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, 
"11000A0B0C0D00000000E1100E0F0312D9010C015501016D617276656C6C2E636F6D00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"); 
#"11000A0B0C0D000022500E1100E00030FD1010B5402656E414141414141414176656C6C21216C65737421200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005555AAAA00000000016000000000000000"); 
# EVT_Send Data
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					#sleep 1;
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					$data_complete = "true"; # Type1 tag completed data writing in Tag Emulation
					sleep 2;
					#Disabling emulation
					&Send_NFC_CMD(ref1,SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x0D, 0x01FF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					
					sleep 2;
				}
				#elsif($next_line =~ m/(8D 50 01 00 00 0A 0B 0C 0D 00)/) # Type 1 Tag 
				#{
					#&Send_NFC_CMD(dut, 0x80, SNFC_HCI_EVT_SEND_DATA, 0x0D, "01"); # EVT_Send Data
					#&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);	
					#$data_complete = "true"; # Type1 tag completed data writing in Tag Emulation
					
				#}
				elsif($next_line =~ m/(8D 52)/ or $next_line =~ m/(8E 52)/ or $next_line =~ m/(91 52)/)
				{
			print "# i am after tag deactivation loop \n";
					$countEmu++;
					$tag_deactivate = "true"; # Tag Decativated after tag Emulation
				}
				elsif($next_line =~ m/(8D 50 30 00 00)/) # Type2 Tag ready to write data during Tag emulation for the first block
				{
					&Send_NFC_CMD(ref1, SNFC_HCI_EVT_SEND_DATA, 0x0D, "04E0660A01020304F148FFFFE110060F");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,15);
				}
				elsif($next_line =~ m/(8D 50 30 04 00)/) # Type2 Tag ready to write data during Tag emulation for the 2nd block
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, "0312D9010C015501016D617276656C6C");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,15);
				}
				elsif($next_line =~ m/(8D 50 30 08 00)/) # Type2 Tag ready to write data during Tag emulation for the 3rd block
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, "2E636F6D000000000000000000000000");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,15);
				}
				elsif($next_line =~ m/(8D 50 30 0C 00)/) # Type2 Tag ready to write data during Tag emulation for the 4th block
				{
					&Send_NFC_CMD(ref1, SNFC_HCI_EVT_SEND_DATA, 0x0D, "00000000000000000000000000000000");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,"SNFC_HCI_ANY_OK",NA,15);
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					$data_complete = "true"; # Type2 tag completed data writing in Tag Emulation

					sleep 2;
					#Disabling emulation
					&Send_NFC_CMD(ref1,SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x0D, 0x01FF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					sleep 2;
				}
				elsif($next_line =~ m/(0B 00 01 80 00 00)/) # for the Type3 1st block
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001100101000500000000000000004B0062");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 15);
				}
				elsif($next_line =~ m/(0B 00 01 80 01 F6 0D 00)/) # for the Type3 2nd block

				{
					&Send_NFC_CMD(ref1, SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001D9010C015501016D617276656C6C2E63");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif($next_line =~ m/(0B 00 01 80 02 C6 6E 00)/) #for the Type3 3rd block
				{
					&Send_NFC_CMD($_[0],SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA0000016F6D0000000000000000000000000000");
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif($next_line =~ m/(0B 00 01 80 03 D6 4F 00)/) #for the Type3 4th block
				{
					&Send_NFC_CMD($_[0],SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif($next_line =~ m/(0B 00 01 80 04 A6 A8 00)/) # for the Type3 5th block
				{
					&Send_NFC_CMD($_[0], SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif($next_line =~ m/(0B 00 01 80 05 B6 89 00)/) # for the Type3 6th block
				{
					&Send_NFC_CMD($_[0], SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif($next_line =~ m/(0B 00 01 80 00 E6 2C 00)/) # for the Type 3 7th block
				{
					&Send_NFC_CMD($_[0],SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001100101000500000000000000004B0062");
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					#&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					$data_complete = "true"; # Type3 tag completed data writing in Tag Emulation

					sleep 2;
					#Disabling emulation
					&Send_NFC_CMD($_[0],SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x0E, 0x01FF);
					&Wait_For_NFC($_[0], Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC($_[0], Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					sleep 2;
				}

				elsif ($next_line =~ m/(8D 50 00 A4 04 00 07 D2 76 00 00 85)/) # NDEF Tag Application select cmd for Type4A
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, 0x9000);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);

				} 
				elsif ($next_line =~ m/(8D 50 00 A4 00 0C 02 E1 03)/ or $next_line =~ m/(8D 50 00 A4 00 00 02 E1 03)/) # Capability container select command for type4A tag Emulation
				{
					
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, 0x9000);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif ($next_line =~ m/(8D 50 00 B0 00 00 0F 00)/) # capability container read procedure for type4A tag Emulation
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, "000F20003B00340406E107004000FF9000");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 15);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 15);
				}
				elsif ($next_line =~ m/(8D 50 00 A4 00 00 02 E1 07)/ or $next_line =~ m/(8D 50 00 A4 00 0C 02 E1 07)/) # Read binary command for type4A tag Emulation
				{
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, 0x9000);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 15);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 15);
				}
				elsif ($next_line =~ m/(8D 50 00 B0 00 00 02 00)/) # NDEF Select command for type4A tag Emulation
				{
					
					&Send_NFC_CMD(ref1,SNFC_HCI_EVT_SEND_DATA, 0x0D, 0x00129000);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 15);
					&Send_NFC_CMD(ref1,  SNFC_HCI_CMD_ANY_SET_PARAMETER,  0x04, 0x0102FFFFFF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(ref1, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 15);
				}
				elsif ($next_line =~ m/(8D 50 00 B0 00 02 32 00)/ or $next_line =~ m/(8D 50 00 B0 00 00 32 00)/) # NDEF select procedure for type4A tag Emulation
				{
					
					&Send_NFC_CMD(ref1, SNFC_HCI_EVT_SEND_DATA, 0x0D, "D9010C015501016D617276656C6C2E636F6D9000");
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 15);
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					#$data_complete = "true";
					sleep 2;
					#Disabling emulation
					&Send_NFC_CMD(ref1,SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x0D, 0x01FF);
					&Wait_For_NFC(ref1, Command_Status_Event, 0x00, NA, NA, 15);
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 15);
					sleep 2;
				}
				elsif ($next_line =~ m/(91 50 00 A4 04 00 07 D2 76 00 00 85)/) # NDEF Tag Application select cmd for Type4B
				{

					&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x11, 0x9000);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				} 
				elsif ($next_line =~ m/(91 50 00 A4 00 0C 02 E1 03)/ or $next_line =~ m/(91 50 00 A4 00 00 02 E1 03)/) # Capability container select command for type4B tag Emulation
				{
					&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x11, 0x9000);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif ($next_line =~ m/(91 50 00 B0 00 00 0F 00)/) # capability container read procedure for type4B tag Emulation
				{
					&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x11, "000F20003B00340406E107004000FF9000");
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif ($next_line =~ m/(91 50 00 A4 00 00 02 E1 07)/ or $next_line =~ m/(91 50 00 A4 00 0C 02 E1 07)/) # Read binary command for type4B tag Emulation
				{
					&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x11, 0x9000);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif ($next_line =~ m/(91 50 00 B0 00 00 02 00)/) # NDEF Select command for type4B tag Emulation
				{
					
					&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x11, 0x00129000);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
				elsif ($next_line =~ m/(91 50 00 B0 00 02 12 00)/ or $next_line =~ m/(91 50 00 B0 00 00 12 00)/) # NDEF select procedure for type4B tag Emulation
				{
					
					&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x11, "D9010C015501016D617276656C6C2E636F6D9000");
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					#&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					$data_complete = "true";
					sleep 2;
					#Disabling emulation
					&Send_NFC_CMD(dut, SNFC_HCI_CMD_ANY_SET_PARAMETER, 0x11, 0x01FF);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
					sleep 2;
				}
				
				else 
				{
					# Do nothing
				}
			}
	 }
	elsif ($next_line =~ m/< (.*)/)
	{
		if($tagtype eq "01")
		{
			#$previousline =$next_line;
	    	#$flagtype1 =0;
		}
		elsif ($tagtype eq "02")
		{
			if($next_line =~ m/(87 10 00 30 00)/ or $next_line =~ m/(87 10 00 30 04)/ or $next_line =~ m/(87 10 00 30 08)/ or $next_line =~ m/(87 10 00 30 0C)/)
			{
				$flagtype2++;
			}
		}
		elsif ($tagtype eq "03")
		{
			if($next_line =~ m/(89 10)/)
			{
			   $flagtype3++;
			   $flagcmd++;	
			}
		}
	}
	else 		
	{   
		if($tagtype eq "01")
		{
			#print "The previous line is: $previousline\n";
			#if($previousline =~  m/> (.*)/)
			#{
				#print "inside else: $cnt\n";
				#$next_line =~ s/^\s+//;
 				#if($flagtype1 == 0)
				#{
			    	#	 $readdata = $previousline . $next_line;
				#	 $readdata =~ s/[\n\r]//g;
				#}
				#else
				#{

				#	$readdata = $readdata . $next_line;
				#	$readdata =~ s/[\n\r]//g;
					
				#}
			#$flagtype1 ++;
			#print ($line),"\n";
			#}
		}
		elsif ($tagtype eq "02")
		{
			$next_line =~ s/^\s+//;
			$readdata = $readdata . $next_line;
			$readdata =~ s/[\n\r]//g;
		}
		elsif ($tagtype eq "03" and $flagcmd ==0)
		{
			$next_line =~ s/^\s+//;
			$readdata = $readdata . $next_line;
			$readdata =~ s/[\n\r]//g;
		} else # Type 3 Tag write data during Tag Emultaion
		{
			if($next_line =~ m/(0B 00 01 80 00 00)/) # for the 1st block
			{
				&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001100101000500000000000000004B0062");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 01 F6 0D 00)/) # for the 2nd block
			{
				&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001D9010C015501016D617276656C6C2E63");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 02 C6 6E 00)/) #for the 3rd block
			{
				&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA0000016F6D0000000000000000000000000000");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 03 D6 4F 00)/) #for the 4th block
			{
				&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 04 A6 A8 00)/) # for the 5th block
			{
				&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 05 B6 89 00)/) # for the 6th block
			{
				&Send_NFC_CMD(dut,SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA00000100000000000000000000000000000000");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			elsif($next_line =~ m/(0B 00 01 80 00 E6 2C 00)/) # for the 7th block
			{
				&Send_NFC_CMD(dut, SNFC_HCI_EVT_SEND_DATA, 0x0E, "0703FEBEEFF1CACACA000001100101000500000000000000004B0062");
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				$data_complete = "true"; # Type3 tag completed data writing in Tag Emulation
			}
			else
			{
				#Do Nothing
			}
		}
	}
	#print " The readdata is: $readdata\n";
	#&HextoString($tagtype, $readdata); # to convert Hex string to Ascii string.
}

###########################################################
sub Build_NFC_Cmd { # <$ARGV

	use bigint;
	my $hcmd = "";
	my $total_arg = @_;
	my $cmd = $_[0];
	my @token;
	my @data;
	my $datasize;
	my $i = 0;
	my $j,$k;
	my @tcmd;
	my $c_length = 0;
	#my $pipe = $_[1];
	my $pipe = "0x80";
	 our $n_hci_cmd;
	my @nfc_hci_cmd;
	my $nfc_string = "";

	$lastCmd = $cmd;
  	@nfc_hci_cmd = split (/:/,$hci_cmd{$cmd}[0][2]);
   	$n_hci_cmd = $nfc_hci_cmd[2];
	$tcmd = @{$hci_cmd{$cmd}[0]};
	$hcmd = $hci_cmd{$cmd}[0][0] . " " . $hci_cmd{$cmd}[0][1];
	$hcmd .= " " . "0C " . "__LENGTH__ " . "__PIPE__ "  . $n_hci_cmd;
	$nfc_string .= "	$nfc_hci_cmd[0] : $n_hci_cmd\n";

	for ($i=1, $j=3; $i<=$tcmd-3; $i++, $j++)
    	{
		my $arg = $_[$i];

		#condition to capture Get parameter Ids
	    if($lastCmd eq "SNFC_HCI_CMD_ANY_GET_PARAMETER" and $arg == 17) # To capture the Static/Dynamic tag nature of Type1
		{
			$Get_param_Id = $arg;

		} else {
			$Get_param_Id = "";


		}
	    if ($arg =~ /NA/) {
			(@token) = split (/:/,$hci_cmd{$cmd}[0][$j]);

	        if ($token[2] eq "") {
				exit 1;
			}
			$hcmd = $hcmd . " " .$token[2]; 
			$nfc_string .= "        $token[0] : $token[2]\n";

		} else {
			if ($arg =~/ACL_HDL/ || $arg =~ /BD_ADDR/ || $arg =~/SCO_HDL/ || $arg =~ /LE_HDL/)
			{
				$hcmd = $hcmd . " " . $arg . " ";
			} else {
				#Check size of actual argument
				(@token) = split (/:/,$hci_cmd{$cmd}[0][$j]);
				if($token[0] eq "PIPE_ID")
				{
					#my pipe = $token[2];
					$pipe += $arg;
					$pipe = substr(Math::BigInt->new($pipe)->as_hex, 2);
					$nfc_string .= "	$token[0] : $pipe\n";

				}
				if ($arg != "" and $arg !~ m/[A-Za-z]/ and index($arg, "+") !=0 and $arg !~ m/^(0108)/ and $arg !~ m/^(0316)/ and $arg !~ m/^(04)/) { 
					$arg = substr(Math::BigInt->new($arg)->as_hex, 2);
					
					if($arg eq "129000") # This is a special case added for Type4 tag Emu where arg parsing is removing the first 00
					{
						$arg = "00".$arg;
					}
					
				}
				
				
				if ($lastCmd eq "SNFC_WR_XCHG_DATA")
				{
					if(index($arg, ",") > 0 )
					{
						#print "############### $addr1 #####\n";
						#print "The tag address is......: $tag1Address and $readdata and $arg \n";
						&build_NFC_NDEF_Data($readdata,$arg); 
					} 
					else 
					{
											
						if(index($arg, "+") == 0 )# + delimeter for read command
						{
	

							$arg = substr($arg, 1, length($arg));

						}
						my $arg_len = (length($arg));


						if ($arg_len % 2 == 1)
						{								
$arg= "0" . $arg;

						}
						my $arglen = substr($arg, 2, 2); # extract arg length
						$tagtype= substr($arg, 0, 2); # extract tag type - payal - done from command.
				       		$arg =substr($arg, 4, (($arglen*2)+2));


						if($tagtype eq "01" and $arglen eq "08")
						{
							#print " #############3 : : substr($arg, 8, 8 ) = $tag1Address ################## \n\n ";
					

							substr($arg, 8, 8 ) = $tag1Address;

						}
						elsif ($tagtype eq "03" and $arglen >= "16")
						{
							substr($arg, 4, 16 ) = $tag3Address;
						}
						elsif($tagtype eq "04" and $Type4MsgExecCount ==3)
						{
							print "The argument for the type4 cmd is:$arg\n";
							$Type4FileIdentifier=~ s/(\s+)//g;
							#print "The value of the Type4FileIdentifier is :$Type4FileIdentifier\n";
							substr($arg, 12, 4 ) = $Type4FileIdentifier;
						} else {
							#Nothing specific
						}
					}
				}
				if($token[0] ne "PIPE_ID")
				{
					if ($token[1] eq "*") {
					#This is special case of commands like Set_parameter of NFC
					my $pad_len = (length($arg));

					if ($pad_len % 2 == 1)
					{
						$pad_len += 1;
					}
					$c_length += $pad_len/2;
					my $h1 = sprintf ("%0${pad_len}s", $arg);
					my @data = ($h1 =~ m/.{2}/g );
					my $t1 = join(" ", @data);  
					$hcmd = $hcmd . " " . $t1 . " ";
					#my $t2 = reverse ($t1 =~ m/../g);
					$nfc_string .= "        $token[0] : $t1\n ";
					
				} else {
					
					my $pad_len = 2 * $token[1];
					$c_length += $token[1];
					my $h1 = sprintf ("%0${pad_len}s", $arg);
					
					my @data = ($h1 =~ m/.{2}/g );
					my $t1 = join(" ", @data);
					#my $t1 = join(" ", ($_[0] =~ m/../g));  
					$hcmd = $hcmd . " " . $t1 . " ";
					#$nfc_string .= "        $token[0] : $t1\n";

					
				}
				
            }
         }
      }
   }
   $c_length += 2; # add one for HCI Command
   my $h1 = sprintf ("%04X", $c_length);
   my $t1 = &Little_Endian($h1);
   $hcmd =~ s/__PIPE__/$pipe/;
  # $hcmd =~ s/__HCI_CMD__/$n_hci_cmd/;
   $hcmd =~ s/__LENGTH__/$t1/;

return ($hcmd, $nfc_string);
}

# Function to extract Tag Address 1 and Tag Address 3 from response packets.
#########################################################

sub Extract_tag_Addr
{
	my $hci_pkt = $_[0];
#print "########$hci_pkt ############# ";
	if ($lastCmd eq "SNFC_HCI_CMD_ANY_GET_PARAMETER")
	{
   		if ((substr($hci_pkt, 14, 8) ne "" or substr($hci_pkt, 14, 16) ne "") and $Get_param_Id != 17)
		{
    		$tag1Address = substr($hci_pkt, 14, 8);
			$tag3Address = substr($hci_pkt, 14, 16);
			#my @data = ($retData =~ m/.{2}/g );
			#$tag1Address = join(" ", @data);
		}
		elsif($Get_param_Id == 17)
		{
			$type1_mem_type = substr($hci_pkt,14,2);

		} else { }
	}
}

# Function to convert hex data to String
#########################################################
sub HextoString { #<Tag Type> <Read data>

	my $tagtype = $_[0];
	my $readdata_1 =$_[1];

	my $len2 = length ($readdata_1);

	if($tagtype eq "01")
	{
		$readdata_1 = substr($readdata_1, 97, $len2);
		# Separate TLV and NDEF Text
		$readdata_1 = &NDEF_TLV_Parsing($readdata_1);
		$data_to_read = $readdata_1;
		$data_to_read =~ s/(\s+)//g;
		$data_to_read_tag1 = $data_to_read;
	}
	elsif($tagtype eq "02")
	{
		$readdata_1 = substr($readdata_1, 48, $len2);
		$data_to_read = &NDEF_TLV_Parsing($readdata_1);
		$data_to_read =~ s/(\s+)//g;
		$data_to_read_tag2 = $data_to_read;
		
	}
	elsif($tagtype eq "03")
	{
		my $readdatafromtype3 = substr($readdata_1, 57, $len2);
		my $NDEFHeader = substr($readdatafromtype3, 0, 5);
		$data_to_read = &NDEF_Data_Parsing($readdatafromtype3, $NDEFHeader);
		$data_to_read =~ s/(\s+)//g;
		$data_to_read_tag3 = $data_to_read;
		
	}
	elsif($tagtype eq "04")
	{
		my $NDEFHeader = substr($readdata_1, 0, 5);
		$data_to_read = &NDEF_Data_Parsing($readdata_1, $NDEFHeader);
		$data_to_read =~ s/(\s+)//g;
		$data_to_read_tag4 = $data_to_read;
		

	} else { }
		$read_complete_flag = 1;
}

#########################################################
#Function to build NDEF data of NFC
#########################################################
sub build_NFC_NDEF_Data # parameter 
{
	my $readVal = $_[0];
	my $writeVal = $_[1];
	my $data;
	my $TLVlen;
	my $datalen;
	my @param;
	my @data;
	my $URIAbb;
	my $URIAbbhex;
	my @dataarray;
	my $NDEFdatalen;
	
	
	#(@data) = split (/\s/, $readVal);
	(@param)= split (/,/,$writeVal);
	
	
	if($param[0] eq "T")
	{
		$data = $param[1];
		$data =~ s/(.)/sprintf("%X",ord($1))/eg;
	}
	if($param[0] eq "U")
	{
		#my $index = index($param[1], ".");
		#print "the index is: $index\n";
		#$URIAbb = substr($param[1], 0, $index+1);
		my @uridata = Uri_abbreviation($param[1]);
		$URIAbbhex = $uridata[0];
		$data = $uridata[1];
		$data =~ s/(.)/sprintf("%X",ord($1))/eg;
		$data = $URIAbbhex.$data;	
	}
	
	$datalen =length($data)/2;
	$data = Build_TLVandData($param[0], $data, $datalen);
	$NDEFdatalen = length($data)/2;
	@dataarray = ($data =~ m/.{2}/g );
	$DatatoWriteinTag = scalar(@dataarray); #Size of the data array to calculate.	
	if($tag1Address ne "00" and length($tag3Address) < 16 and length($tag1Address) == 8) # indicates Type1 Tag
	{
		
		# Send_WR_XCHG_DATA command for Type1 Writing
		&send_cmd_forType1_Tag(@dataarray);
	}
	elsif($tag1Address eq "00" and $tag3Address eq "00") # indicates Type2 Tag
	{
		#Send_WR_XCHG_DATA command for Type2 Writing
		&send_cmd_forType2_Tag(@dataarray);
	}
	elsif($tag3Address ne "00" and length($tag3Address) ==16)
	{
		&send_cmd_forType3_Tag($NDEFdatalen, @dataarray);
	} 
	else 
	{
		&send_cmd_Type4_tag($NDEFdatalen, @dataarray);
	}
	#return @dataarry;	
}
######################################################################
# Build TLV and NDEF Message for NFC

sub Build_TLVandData # Parameter as data type, Hex Data to write, datalength
{
	my $param 	=$_[0];
	my $data 	= $_[1];
	my $datalen 	= $_[2];
	my $language ="656E";
	my @dataarray;
  
	if($param eq "T") #text data to write
	{
		my $datalentxt = $datalen + 3;
		$datalentxt = sprintf ("%02X", $datalentxt);
		my $TLVlentxt  = $datalen + 7;
		$TLVlentxt  = sprintf ("%02X", $TLVlentxt);
		$data = "03".$TLVlentxt."D101".$datalentxt."5402".$language.$data;
		#@dataarray = ($data =~ m/.{2}/g );
	}
	elsif($param eq "U") #URL data to write
	{
		my $datalentxt = $datalen;
		$datalentxt = sprintf ("%02X", $datalentxt);
		my $TLVlentxt  = $datalen + 6;
		$TLVlentxt  = sprintf ("%02X", $TLVlentxt);
		$data = "03".$TLVlentxt."D101".$datalentxt."55".$URIAbbhex.$data;
		#@dataarray = ($data =~ m/.{2}/g );
	} else {
			# define other RTDs
			#@dataarray= "";
	}
	return $data;
}

######################################################################
# Command Sent to hci interface for Type1 Data Writing - For NFC

sub send_cmd_forType1_Tag # Parameter = DataArray
{
	my (@dataarray)= @_;
	my $command;
	my $bytelocation = 0x0C;
	my $count =0;
	my $dataarraysize = scalar(@dataarray); # Size of the data Array

sleep 2;

	foreach my $item(@dataarray)
	{
		my $location = sprintf("%0X", $bytelocation);
		if(length($location) < 2)
		{
			$location = "0".$location;
		}
		#substr(Math::BigInt->new($bytelocation)->as_hex, 2);
		$command = "01080053".$location.$item.$tag1Address;
		&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x87, $command);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		#print "The command", $count, " is: ", $command, "\n";
		$count++;
		$bytelocation += 0x01;
	}
	$noOfBytesWritten = $count;
	
}
######################################################################
# Command Sent to hci interface for Type2 Data Writing - For NFC

sub send_cmd_forType2_Tag      # Parameter = DataArray
{
	my (@dataarray)= @_;
	my $bytecount = 0;
	my $dataBytes ="";
	my $command;
	my $bytelocation = 0x04;
	my $i;
	my $count =0;
	my $dataarraysize = scalar(@dataarray); # Size of the data Array

sleep 2;

	foreach my $item(@dataarray)
	{
		if($bytecount <4)
		{
			$dataBytes = $dataBytes.$item;
			$bytecount++;
		} else {
			my $location = sprintf("%0X", $bytelocation);
			if (length($location) < 2)
			{
				$location="0".$location;
			}
			$command = "020700A2".$location.$dataBytes;
			$dataBytes=$item;
			$bytecount =1;
			$bytelocation += 0x01;
			
			&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x87, $command);
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",0x000A, 5);
		}

		$count++;
		
	}
	if((length($dataBytes)/2) <= 4) # The Last Remaining bytes
	{
	    my $remainbytes = 4-(length($dataBytes)/2);
		#print "The remainbytes :$remainbytes\n";
		for($i=0; $i<$remainbytes; $i++)
		{
			$dataBytes = $dataBytes."00";
		}
		$bytelocation = sprintf("%0X", $bytelocation);
		if (length($bytelocation) < 2)

		{
			$bytelocation="0".$bytelocation;
		}
		$command = "020700A2".$bytelocation.$dataBytes;
		&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x87, $command);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",0x000A, 5);
		
	}

	$noOfBytesWritten = $count;
}

######################################################################
# Command Sent to hci interface for Type3 Data Writing - For NFC

sub send_cmd_forType3_Tag # Parameter = DataArray, NDEFData_Length
{
	use bigint;
	my $NDEFdatalen =$_[0];
	my (@dataarray)= @_;
	my $command;
	my $checksum;
	my $noOfUserBlk = int($NDEFdatalen/16);
	my $bytecount = 0;
	my $dataBytes; 
	my $bytelocation = 0x01;
	my $count =0;
	
	$noOfBlockNDEFT3 =~ s/(\s+)//g; # remove space between 2 bytes of data for max no of NDEF data blocks supported
	$noOfBlockNDEFT3 = hex($noOfBlockNDEFT3);

	$NDEFdatalen = sprintf("%00000X", $NDEFdatalen);
	my $len = length($NDEFdatalen);
	splice @dataarray, 0, 3; # revome First 3 elements from the array.
	#$dataarray[1] = "00"; # Substitute first byte as 00 as TLV block is not there in Type3
	#$dataarray[0] = "00"; # Substitute second byte as 00 as TLV block is not there in Type3
	#print "The length of the NDEF data: $len\n";

	if(length($NDEFdatalen) < 6 )
	{
		for($i=0; $i<(6-$len); $i++)
		{
			$NDEFdatalen = "0".$NDEFdatalen;
		}
	}
	print "The NDEF Data length is: $NDEFdatalen\n";
	# First command to set Attribute values
	my $AttrVal = "10".$noOfBlocktoReadT3."01000D000000000F01".$NDEFdatalen;
	$checksum = &calculateChkSumType3($AttrVal);
	$command = "03310008".$tag3Address."01090001800010".$noOfBlocktoReadT3."01000D000000000F01".$NDEFdatalen.$checksum;


	&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x09, $command);
	&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
	&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);

	#print "The no of userblock:$noOfUserBlk\n";
	#Generate commands for the User blocks
	foreach my $item(@dataarray)
	{
		if($bytecount <16)
		{
			$dataBytes = $dataBytes.$item;
			$bytecount++;
		} else {
			my $location = sprintf("%0X", $bytelocation);
			if (length($location) < 2)
			{
				$location="0".$location;
			}
			$command = "03320008".$tag3Address."0109000180".$location.$dataBytes;
			$dataBytes=$item;
			$bytecount =1;
			$bytelocation += 0x01;
			print "the Byte location is: $bytelocation\n";

			&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x09, $command);

			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		}
		$count++;
	}
	if((length($dataBytes)/2) <= 16) # The Last Remaining bytes
	{
	    my $remainbytes = 16-(length($dataBytes)/2);
		#print "The remainbytes :$remainbytes\n";
		for($i=0; $i<$remainbytes; $i++)
		{
			$dataBytes = $dataBytes."00";
		}
		$bytelocation = sprintf("%0X", $bytelocation);
		if (length($bytelocation) < 2)
		{
			$bytelocation="0".$bytelocation;
		}
		$command = "03320008".$tag3Address."0109000180".$bytelocation.$dataBytes;

		&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x09, $command);
		&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
		&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
	}
	$noOfBytesWritten = $count + 2;
}


######################################################################
# Calculate Checksum for the Attribute Information of the Type3 tag - For NFC

sub calculateChkSumType3 # Attribute Information.
{
	my $AttrVal= $_[0];
	my @Attrarray;
	my $checksum;
	@Attrarray = ($AttrVal =~ m/.{2}/g );	

	foreach my $item(@Attrarray)
	{
		my $int_item = hex($item);
		$checksum+=$int_item;
	}
	$checksum = sprintf("%000X", $checksum);
	my $len = length($checksum);
	if(length($checksum) < 4 )
	{
		for($i=0; $i<(4-$len); $i++)
		{
			$checksum = "0".$checksum;
		}
	}
	return $checksum;
}


######################################################################
# Command Sent to hci interface for Type4 Data Writing - For NFC

sub send_cmd_Type4_tag # Parameter = DataArray, NDEFData_Length
{
	use bigint;
	my $NDEFdatalen =$_[0];
	my (@dataarray)= @_;
	my $noofbytestowrite = 50;
	my $noOfcmdtowrite;
	my $bytecount =0;
	my $dataBytes;
	my $bytelocation = 0x0000;
	my $cmdlength; 
	my $count =0 ;
	splice @dataarray, 0, 3; # revome First 3 elements from the array.
	$NDEFdatalen = $NDEFdatalen - 2;
	my $datalen = scalar @dataarray;
	my $Lc = sprintf("%0X", ($datalen +2));
	if (length($Lc) < 2)
	{
		$Lc="0".$Lc;
	}
	my $NLEN = sprintf("%0X", $datalen);
	my $lenNLEN = length($NLEN);
	if ($lenNLEN < 4)
	{
		for(my $k=0; $k<(4-$lenNLEN); $k++)
		{
			$NLEN = "0".$NLEN;
					
		}
	}

	
	if($Type4MsgExecCount == 5 and $Type4WriteAccess ==1) 
	{
		$noOfcmdtowrite = int($Type4memory/$noofbytestowrite) + int(($noofbytestowrite)/($Type4memory % $noofbytestowrite));
		foreach my $item(@dataarray)
		{
			if($bytecount < $noofbytestowrite)
			{
				$dataBytes = $dataBytes.$item;
				$bytecount++;
			}
			else

			{
				my $location = sprintf("%0X", $bytelocation);
				my $lenloc = length($location);
				if($lenloc < 4 )
				{
					for(my $i=0; $i<(4-$lenloc); $i++)
					{
						$location = "0".$location;
					}
				}
				my $cmdlength = 8 + $noofbytestowrite;
				$command = "04".$cmdlength."1E00D6".$location.$Lc.$NLEN.$dataBytes;
				$dataBytes=$item;
				$bytecount =1;
				$bytelocation += 50;

				&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, $command);
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
			}
			$count ++;
		}
		if((length($dataBytes)/2) <= $noofbytestowrite) # The Last Remaining bytes/length less than $noofbytestowrite
		{
			my $remainbytes = $noofbytestowrite-(length($dataBytes)/2);
			#print "The remainbytes :$remainbytes\n";
			#for(my $i=0; $i<$remainbytes; $i++)
			#{
			#	$dataBytes = $dataBytes."00";
			#}

			#print "The dataBytes are: $dataBytes\n";
			$bytelocation = sprintf("%0X", $bytelocation);
			my $len = length($bytelocation);
			if ($len < 4)
			{
				for(my $j=0; $j<(4-$len); $j++)
				{
					$bytelocation = "0".$bytelocation;
				}
			}
			
			if ($bytelocation == 0) # If length of data is < $noofbytestowrite.
			{
				$cmdlength = 8 + length($dataBytes)/2;
				$command = "04".$cmdlength."1E00D6".$bytelocation.$Lc.$NLEN.$dataBytes;
			} else {
				$cmdlength = 5 + length($dataBytes)/2;
				$command = "04".$cmdlength."1E00D6".$bytelocation.$dataBytes;
			}
			
			&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x07, $command);
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		} 	
	}
	$noOfBytesWritten = $count;
}
######################################################################
# Map Uri abbreviation to Hex value - For NFC

sub Uri_abbreviation #Abbreviation 
{
	use bigint;
	my $param  = $_[0];
	my$data;
	my @uridata;
	my $index;
	my $uriAbb;
	my $urihex;

	if ($param =~ m/http:\/\/www./)
	{
		$index = index($param ,".");
		$uriAbb = 0x01;
	}
	elsif ($param =~ m/https:\/\/www./)
	{

		$index = index($param ,".");
		$uriAbb = 0x02;
	}
	elsif ($param =~ m/http:\/\//)
	{
		$index = index($param ,":")+2;;
		$uriAbb = 0x03;
	}
	elsif ($param =~ m/https:\/\//)
	{
		$index = index($param ,":")+2;
		$uriAbb = 0x04;
	}
	elsif ($param =~ m/tel:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x05;
	}
	elsif ($param =~ m/mailto:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x06;
	}
	elsif ($param =~ m/:anonymous/)
	{
		$index = index($param ,"@");
		$uriAbb = 0x07;
	}
	elsif ($param =~ m/ftp:\/\/ftp./)
	{
		$index = index($param ,".");
		$uriAbb = 0x08;
	}
	elsif ($param =~ m/ftps:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x09;
	}
	elsif ($param =~ m/sftp:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x0A;
	}
	elsif ($param =~ m/smb:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x0B;
	}
	elsif ($param =~ m/nfs:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x0C;
	}
	elsif ($param =~ m/^ftp:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x0D;
	}
	elsif ($param =~ m/dav:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x0E;
	}
	elsif ($param =~ m/news:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x0F;
	}
	elsif ($param =~ m/telnet:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x10;
	}
	elsif ($param =~ m/imap:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x11;
	}
	elsif ($param =~ m/rtsp:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x12;
	}
	elsif ($param =~ m/urn:/  and $param !~ m/id:/ and $param !~ m/tag:/ and $param !~ m/pat:/ and $param !~ m/raw:/ and $param !~ m/epc:/ and $param !~ m/nfc:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x13;
	}
	elsif ($param =~ m/pop:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x14;
	}
	elsif ($param =~ m/sip:/)
	{

		$index = index($param ,":");
		$uriAbb = 0x15;
	}
	elsif ($param =~ m/sips:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x16;
	}
	elsif ($param =~ m/tftp:/)
	{
		$index = index($param ,":");
		$uriAbb = 0x17;
	}
	elsif ($param =~ m/btspp:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x18;
	}
	elsif ($param =~ m/btl2cap:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x19;
	}
	elsif ($param =~ m/btgoep:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x1A;
	}
	elsif ($param =~ m/tcpobex:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x1B;
	}
	elsif ($param =~ m/irdaobex:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x1C;
	}
	elsif ($param =~ m/file:\/\//)
	{
		$index = index($param ,"/")+1;
		$uriAbb = 0x1D;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/id:/)
	{
		$index = index($param ,"d")+1;
		$uriAbb = 0x1E;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/tag:/)
	{
		$index = index($param ,"g")+1;
		$uriAbb = 0x1F;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/pat:/)
	{
		$index = index($param ,"t")+1;
		$uriAbb = 0x20;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/raw:/)
	{
		$index = index($param ,"w")+1;
		$uriAbb = 0x21;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/epc:/)
	{
		$index = index($param ,"c")+1;
		$uriAbb = 0x22;
	}
	elsif ($param =~ m/urn:/ and $param =~ m/nfc:/)
	{
		$index = index($param ,"c")+1;
		$uriAbb = 0x23;
	}
	else
	{
		$uriAbb = 0x00;
	}
	$urihex = sprintf ("%02X", $uriAbb);
	$data = substr($param,$index +1);
	$uridata[0]= $urihex;
	$uridata[1]= $data;
	return @uridata;
}


######################################################################
# Decode Uri abbreviation from Hex value to String value - For NFC

sub Uri_Decode_to_String #Hex String
{

	my $param  = $_[0];
	my $uriString;
	if ($param eq "01")
	{
		$uriString = "http://www.";
	}
	elsif ($param eq "02")
	{
		$uriString = "https://www.";
	}
	elsif ($param eq "03")

	{
		$uriString = "http://";
	}
	elsif ($param eq "04")
	{
		$uriString = "https://";
	}
	elsif ($param eq "05")
	{
		$uriString = "tel:";
	}
	elsif ($param eq "06")
	{
		$uriString = "mailto:";
	}
	elsif ($param eq "07")
	{
		$uriString = "ftp://anonymous:anonymous@";
	}
	elsif ($param eq "08")
	{
		$uriString = "ftp://ftp.";
	}
	elsif ($param eq "09")
	{
		$uriString = "ftps://";
	}
	elsif ($param eq "0A")
	{
		$uriString = "sftp://";
	}
	elsif ($param eq "0B")
	{
		$uriString = "smb://";
	}
	elsif ($param eq "0C")
	{
		$uriString = "nfs://";
	}
	elsif ($param eq "0D")
	{
		$uriString = "ftp://";
	}
	elsif ($param eq "0E")
	{
		$uriString = "dav://";
	}
	elsif ($param eq "0F")
	{
		$uriString = "news:";
	}
	elsif ($param eq "10")
	{
		$uriString = "telnet://";
	}
	elsif ($param eq "11")
	{
		$uriString = "imap:";
	}
	elsif ($param eq "12")
	{
		$uriString = "rtsp://";
	}
	elsif ($param eq "13")
	{
		$uriString = "urn:";
	}
	elsif ($param eq "14")
	{
		$uriString = "pop:";
	}
	elsif ($param eq "15")
	{
		$uriString = "sip:";
	}
	elsif ($param eq "16")
	{
		$uriString = "sips:";
	}
	elsif ($param eq "17")
	{
		$uriString = "tftp:";
	}
	elsif ($param eq "18")
	{
		$uriString = "btspp://";
	}
	elsif ($param eq "19")
	{
		$uriString = "btl2cap://";
	}
	elsif ($param eq "1A")
	{
		$uriString = "btgoep://";
	}
	elsif ($param eq "1B")
	{
		$uriString = "tcpobex://";
	}
	elsif ($param eq "1C")
	{
		$uriString = "irdaobex://";
	}
	elsif ($param eq "1D")
	{
		$uriString = "file://";
	}
	elsif ($param eq "1E")
	{
		$uriString = "urn:epc:id:";
	}
	elsif ($param eq "1F")
	{
		$uriString = "urn:epc:tag:";
	}
	elsif ($param eq "20")
	{
		$uriString = "urn:epc:pat:";
	}
	elsif ($param eq "21")
	{
		$uriString = "urn:epc:raw:";
	}
	elsif ($param eq "22")
	{
		$uriString = "urn:epc:";
	}
	elsif ($param eq "23")
	{
		$uriString = "urn:nfc:";
	}
	else
	{
		$uriString = 0x00;
	}

	return $uriString;
}
######################################################################
# Parse NDEF TLV data for different Record Type
sub NDEF_TLV_Parsing
{
my $read_data = $_[0];
my $parsed_data;
	my $TLVTag = substr($read_data, 0, 2);
		if ($TLVTag eq "03")
		{
			my $TLVLen = substr($read_data, 3, 2);
			$TLVLen = hex($TLVLen);
			print "The TLV length is: $TLVLen\n";
			my $NDEFdata = substr($read_data, 6, (($TLVLen*2)+ ($TLVLen -1)));
			my $NDEFHeader = substr ($NDEFdata, 0, 5);
			$parsed_data = &NDEF_Data_Parsing($NDEFdata, $NDEFHeader);
			
		}
return $parsed_data;
}
######################################################################
# Parse NDEF message data for different Record Type
sub NDEF_Data_Parsing
{
	my $NDEFdata = $_[0];
	my $NDEFHeader = $_[1];
	my $read_data;
	if ($NDEFHeader eq "D1 01")
	{
		my $NDEFlen = substr($NDEFdata, 6, 2);
		$NDEFlen = hex($NDEFlen);
		my $NDEFdata = substr($NDEFdata,9,((($NDEFlen*2)+2)+ $NDEFlen));
		my $NDEFType =  substr($NDEFdata, 0, 2);

		if ($NDEFType eq "54") # data type Text
		{
			my $NDEFStatusByte = substr($NDEFdata, 3, 2);
			if ($NDEFStatusByte eq "02") # UTF-8 Type
			{
				my $NDEFLang = substr($NDEFdata, 6, 5);
				if($NDEFLang eq "65 6E")
				{
					$read_data = substr($NDEFdata, 12, ((($NDEFlen*2)+2)+ $NDEFlen)-12);
					$read_data =~s/([a-fA-F0-9][a-fA-F0-9])/chr (hex($1))/eg;
				}
			}
		}
		elsif($NDEFType eq "55") # Data Type URI
		{
			my $NDEFUriType = substr($NDEFdata, 3, 2);
			my $NDEFUriText = &Uri_Decode_to_String($NDEFUriType);
			$read_data = substr($NDEFdata, 6, ((($NDEFlen*2)+2)+ $NDEFlen)-3);
			$read_data =~s/([a-fA-F0-9][a-fA-F0-9])/chr (hex($1))/eg;
			$read_data = $NDEFUriText.$read_data;
		} else {
			#For Other Record Type.
		}
	}
	return $read_data;
}
######################################################################
# Expected data passed for validating Tag Read functionalities.
sub expected_data_read_from_tag #param = expected data as string
{
	my $data = $_[0];
	$expected_data = $data;
}
######################################################################
# Function to build commands for reading data from Type2 tag
sub build_write_cmd_type2
{

	my $Type2Tagmemsize = $_[0];
	my $noOfBytes;
	my $noOfBlocks;
	my $noOfWriteCycle;
	my $startByteLoc =0;
	my $byteLoc;
	my $command;
	my $i;
if ($T2_Emulation == 1) {
	$noOfBytes = hex($Type2Tagmemsize) * 8;

	$noOfBlocks = $noOfBytes/4;
	$noOfWriteCycle = $noOfBlocks/4;
	print "The no of write cycle is: $noOfWriteCycle\n";
	for($i=0; $i<$noOfWriteCycle; $i++)
	{
		$startByteLoc += 4;
		#print "The byteloc is:$startByteLoc\n"; 
		$byteLoc = sprintf("%0X", $startByteLoc);
		if (length($byteLoc) < 2)
		{
			$byteLoc="0".$byteLoc;
		}
		$command = "+02030030".$byteLoc;
		print "The command is:$command\n"; 
		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x87, $command);
		&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25); # Payal: Added for Emultaion only		
		#print "First wait for\n";
		if($i == ($noOfWriteCycle-1)) { }	
		else {
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);

			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, NA,NA, 5);
		}
	}
} else {

	$noOfBytes = hex($Type2Tagmemsize) * 8;
	$noOfBlocks = $noOfBytes/4;
	$noOfWriteCycle = $noOfBlocks/4;
	print "The no of write cycle is: $noOfWriteCycle\n";
	for($i=0; $i<$noOfWriteCycle; $i++)
	{
		$startByteLoc += 4;
		#print "The byteloc is:$startByteLoc\n"; 
		$byteLoc = sprintf("%0X", $startByteLoc);
		if (length($byteLoc) < 2)
		{
			$byteLoc="0".$byteLoc;
		}
		$command = "+02030030".$byteLoc;
		print "The command is:$command\n"; 
		&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x87, $command);
		#&Wait_For_NFC(ref1, Vendor_Specific_Event,C0,NA,NA,NA,NA,NA,25); # Payal: Added for Emultaion only		
		#print "First wait for\n";
		if($i == ($noOfWriteCycle-1)) { }	
		else {
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, NA,NA, 5);
		}
	}	
}

}
######################################################################
# Function to build commands for reading data from Type3 tag

sub build_type3_read_cmd
{
	my $arg = $_[0];
	my $noOfcmdtoRead;
	my $location = 1;
	my $command;
	my $readlocation;
	my $sendcmdtrue;
	my $cmdlength;
	$noOfBlockNDEFT3 =~ s/(\s+)//g; # remove space between 2 bytes of data for max no of NDEF data blocks supported
	$noOfBlockNDEFT3 = hex($noOfBlockNDEFT3);
	if ($noOfBlocktoReadT3 == 0)
	{
		&monitor_result('error', "The Type3 tag Attribute data returned is not correct");
	}
	if($noOfBlockNDEFT3 == 0)
	{
		&monitor_result('error', "The Type3 tag Attribute data returned is not correct");
	}
	$noOfcmdtoRead = int($noOfBlockNDEFT3/$noOfBlocktoReadT3) + ($noOfBlockNDEFT3 % $noOfBlocktoReadT3);
	
sleep 5;

	for (my $j=1; $j<=$noOfcmdtoRead; $j++) # build no of commands based on no of block can be read parameter
	{
		my $command = $arg;
		$readlocation = $location;
	
		if ($j == $noOfcmdtoRead) # If the last command and no of block can be < max block can be read
		{
			$noOfBlocktoReadT3 = $noOfBlockNDEFT3 % $noOfBlocktoReadT3;
			#print "The no of block in if condition: $noOfBlocktoReadT3\n"
		} else {
			$noOfBlocktoReadT3 = $noOfBlocktoReadT3;
			#print "The no of block in else condition: $noOfBlocktoReadT3\n"
		}
		$cmdlength = 14 + 2*$noOfBlocktoReadT3; # Calculate the length to pass to the command
		if (length($cmdlength) <2)
		{
			$cmdlength = "0".$cmdlength;
		}
		if (length($noOfBlocktoReadT3) <2)
		{
			$noOfBlocktoReadT3 = "0".$noOfBlocktoReadT3;
		}
		substr($command,30,2) = $noOfBlocktoReadT3; 
		substr($command, 2, 2 )= $cmdlength;

		for (my $i=0; $i<$noOfBlocktoReadT3; $i++) # Build each read command for max noof block can be read
		{
			my $hexreadlocation = sprintf ("%02X", $readlocation);
			if (length($hexreadlocation) <2)
			{
				$hexreadlocation = "0".$hexreadlocation;
			}
			$command = $command."80".$hexreadlocation;#Building commands for reading data for blocks available to read.
			$readlocation++;
		}	
		$location = $location + 4;
		&Send_NFC_CMD(dut,SNFC_WR_XCHG_DATA, 0x89, $command);

		if ($j != $noOfcmdtoRead) # if not the last command for read
		{
			&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
			&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
		} else {
			#No event to be captured from this function
		}
	}
}

######################################################################
# Function to build commands for reading/writing data from Type4 tag

sub readwrite_data_type4_NDEF_file
{
	my $response = $_[0]; # The response retruned.
	my $noOfcmdtoRead; # no of commands require to read $noofbytestoread bytes in each commands;
	my $noofbytestoread = 50; # No of b ytes to read in each command
	my $byteOffset= 0;
	my $byteOffsethex;
	my $noofbyteshex;
	my $command;
	$response = substr($response, 24, (length($response)-25));
	my $len = length($response);
	
	if (length($response) ==  84 and $response =~ m/(90 00)/) #Response for Read Binary Data from the CC file
	{
		$Type4MsgExecCount+=1;# If the responses returns success(90 00)increase success counter by one
		$Type4FileIdentifier = substr($response, 57, 5);
		$Type4memory = substr($response, 63, 5);
		$Type4memory =~ s/(\s+)//g;
		$Type4memory = hex($Type4memory) -2;
		if(substr($response, 69, 2) eq "00")
		{
			$Type4ReadAccess =1;
		}
		if(substr($response, 72, 2) eq "00")
		{
			$Type4WriteAccess =1;
		}
	}
	elsif(length($response) ==  45 and $response =~ m/(90 00)/)
	{
		$Type4MsgExecCount+=1;# If the responses returns success(90 00)increase success counter by one
		$Type4NLEN = substr($response, 30, 5);
		$Type4NLEN =~ s/(\s+)//g;
		$Type4NLEN = hex($Type4NLEN);
	}
	elsif(length($response) ==  39 and $response =~ m/(90 00)/)
	{
		$Type4MsgExecCount+=1;# If the responses returns success(90 00)increase success counter by one
	}
	else
	{
		if($response =~ m/(90 00)/)
		{
			$Type4MsgExecCount+=1; # If the responses returns success(90 00)increase success counter by one
		}
		# If all the response returns success, NLEN >000h and NLEN> max NDEF Message size, then read the data
		if($Type4MsgExecCount == 0)
		{
			# Write complete.
		}
		elsif($Type4MsgExecCount == 6 and $Type4NLEN > 0 and $Type4NLEN < $Type4memory and $Type4ReadAccess ==1) 
		{
			$noOfcmdtoRead = int($Type4memory/$noofbytestoread) + int(($noofbytestoread)/($Type4memory % $noofbytestoread));
			$readdata = substr($response, 36, (length($response)-36 -9)); # The first response
			$readdata =~ s/[\n\r]//g;

			for (my $i=1; $i<$noOfcmdtoRead; $i++)
			{
				#calculate byteoffset
				$byteOffset = 0 + $i*50;
				$byteOffsethex = sprintf ("%04X", $byteOffset);
				my $len = length($byteOffsethex);
				if(length($byteOffsethex) < 4 )
				{
					for($i=0; $i<(4-$len); $i++)
					{
						$byteOffsethex = "0".$byteOffsethex;

					}
				}	
				if ($i == ($noOfcmdtoRead-1)) # last command
				{
					$noofbytestoread = $Type4memory - int($Type4memory/$noofbytestoread)*$noofbytestoread;
					$noofbyteshex = sprintf ("%0X", $noofbytestoread);
					if (length($noofbyteshex) < 2)
					{
						$noofbyteshex="0".$noofbyteshex;
					}
					$command = "04061E00B0".$byteOffsethex.$noofbyteshex;
					$Type4lastcmd = 1; 
					&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x87, $command);
				} else {
					$noofbytestoread = $noofbytestoread;
					$noofbyteshex = sprintf ("%0X", $noofbytestoread);
					if (length($noofbyteshex) < 2)
					{
						$noofbyteshex="0".$noofbyteshex;
					}
					$command = "04061E00B0".$byteOffsethex.$noofbyteshex;
					&Send_NFC_CMD(dut, SNFC_WR_XCHG_DATA, 0x87, $command);
					&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
					&Wait_For_NFC(dut, Vendor_Specific_Event, C0, NA, NA,NA, "SNFC_HCI_ANY_OK",NA, 5);
				}
			}
		}
		elsif($Type4MsgExecCount > 6)
		{
			my $readresponse = substr($response, 30, (length($response) -30 -9));
			$readdata = $readdata.$readresponse; 
			$readdata =~ s/[\n\r]//g;
			if ($Type4lastcmd == 1)
			{
				&HextoString($tagtype, $readdata); # to convert Hex string to Ascii string.
			} else {
					# Nothing
			}
		}
		elsif($Type4MsgExecCount < 6 )
		{
			&monitor_result('error', "Type4 NDEF data Reading is not successful");
		}
		elsif($Type4NLEN < 0)
		{
			&monitor_result('error', "Type4 tag Platform might be in Initialized State");
		}
		elsif($Type4NLEN > $Type4memory)
		{
			&monitor_result('error', "Type4 tag Platform is not in valid State");
		} else {
			&monitor_result('error', "Unknown Error");
		}
	}
}

######################################################################
# Function to Handle NFC error
sub handle_NFC_error
{
	
	my $error_str = $_[0];
	my $line = $_[1];
	print "the error string in function is:$error_str\n";
	print "the last command is : $lastCmd\n";
	print "the negtest is : $NegTest\n";
	
	if($error_str eq "81")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 81: the connection to Gate is not working");
		}
		else
		{
			&monitor_result('error', "Error code 81: the connection to Gate is not working");
		}
	}
	elsif($error_str eq "82")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 82: Unknown parameter in Set_parameter command");
		}
		else
		{
			&monitor_result('error', "Error code 82: Unknown parameter in Set_parameter command");
		}
	}
	elsif($error_str eq "83")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 83: General Error");
		}
		else
		{
			&monitor_result('error', "Error code 83: General Error");
		}
	}
	elsif($error_str eq "84")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 84: No more dynamic pipes can be created");
		}
		else
		{
			&monitor_result('error', "Error code 84: No more dynamic pipes can be created");
		}
	}
	elsif($error_str eq "85")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 85: Unknown parameter");
		}
		else
		{
			&monitor_result('error', "Error code 85: Unknown parameter");
		}
	}
	elsif($error_str eq "86")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 86: The command was sent to closed pipe");
		}
		else
		{
			&monitor_result('error', "Error code 86: The command was sent to closed pipe");
		}
	}
	elsif($error_str eq "87")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 87: Unknown command, The command is not supported by the pipe");
		}
		else
		{
			&monitor_result('error', "Error code 87: Unknown command, The command is not supported by the pipe");
		}
	}
	elsif($error_str eq "88")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 88: Command is inhibited due to failure of lower layer identity check");
		}
		else
		{
			&monitor_result('error', "Error code 88: Command is inhibited due to failure of lower layer identity check");
		}
	}
	elsif($error_str eq "89")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 89: Command couldnot be completed in time");
		}
		elsif($lastCmd eq "SNFC_WR_XCHG_DATA" and $NegTest = "false")
		{
			print "The tagtype is: $tagtype\n";
			print "The line is: $line\n";
			print "the data size written: $noOfBytesWritten\n";
			print "The data size to write: $DatatoWriteinTag\n";
			if($tagtype eq "01" and $noOfBytesWritten !=0 and $DatatoWriteinTag !=0 and ($noOfBytesWritten == $DatatoWriteinTag))
			{
				&Send_NFC_CMD(dut,SNFC_EVT_END_OPERATION, 0x07);
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				$readdata = "";
				$tagtype = "";
				&monitor_result('end_test', "Warning: There is an extra cmd in Type1 write tag operation which is returning 89 error");
			}
			elsif($tagtype eq "02" and $noOfBytesWritten !=0 and $DatatoWriteinTag !=0  and ($noOfBytesWritten == $DatatoWriteinTag))
			{
				
				&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, 0x07);
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				$readdata = "";
				$tagtype = "";
				&monitor_result('end_test', "Warning: There is an extra cmd in Type2 write tag operation which is returning 89 error");
			}
			elsif($tagtype eq "03" and $noOfBytesWritten !=0 and $DatatoWriteinTag !=0 and ($noOfBytesWritten == $DatatoWriteinTag))
			{
				&Send_NFC_CMD(dut, SNFC_EVT_END_OPERATION, 0x09);
				&Wait_For_NFC(dut, Command_Status_Event, 0x00, NA, NA, 5);
				$readdata = "";
				$tagtype = "";
				&monitor_result('end_test', "Warning: There is an extra cmd in Type3 write tag operation which is returning 89 error");
			}
			else
			{
				
       				&monitor_result('error', "Error code 89: Command couldnot be completed in time");
			}	
			
		}
		else
		{
			&monitor_result('error', "Error code 89: Command couldnot be completed in time");
		}	
	}
	elsif($error_str eq "8A")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 8A:Access Denied");
		}
		else
		{
			&monitor_result('error', "Error code 8A:Access Denied");
		}
	}
	elsif($error_str eq "8B")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 8B:Permission denied to create a pipe due to Whitelist violation");
		}
		else
		{
			&monitor_result('error', "Error code 8B:Permission denied to create a pipe due to Whitelist violation");
		}
	}
	elsif($error_str eq "90")
	{
		if($NegTest eq "true")
		{
			&monitor_result('end_test', "Error code 90:Error in data Exchange");
		}
		else
		{	
			&monitor_result('error', "Error code 90:Error in data Exchange");
		}
	}
	else
	{
		#Do Nothing.
	}
}


#######################################################


sub Open_Reading_NFC_Log {
	my($NFClogfile);
	my($handle);
	my($fhandle);
	my($retry) = $_[3]; # 3 retry, exit if fail

	
	$handle = "Q_" . $_[0];
	$fhandle = "N_" . $_[0];
	$NFClogfile = $_[2];
	
	&StartNFCLog($_[0], $_[1], $NFClogfile);

	if ((!open($fhandle, $NFClogfile)) && ($retry < 3)) {
		$retry++;
		&dprint("Logfile $NFClogfile failed to open, retrying...\n");
		&Open_Reading_NFC_Log($_[0], $_[1], $_[2], $retry);
	}
	if ($retry > 1) {
		&dprint("System seems to be DEAD !!! - shutting down\n");
		&monitor_result('system_dead');
	}
	&dprint("-->$fhandle nfclog - $NFClogfile\n");
}

#######################################################

sub StartNFCLog {

	my($handle);
	my($NFClogfile);
	my $cmd;
	my $port = $_[1];
	
	$handle = "Q_" . $_[0];
	$NFClogfile = $_[2];
	my $tmpNFClogfile = $NFClogfile;
	$tmpNFClogfile =~ s/\.log$/tmp\.log/;

	if (-r $NFClogfile) {
		if (!unlink($NFClogfile)) {
			print "*FAILED*\nUnable to Clobber Old Logfile.\n";
			## &CloseBcomm;
			print "\nPlease check the log name and try again.\n\n";
				exit(1);

		}
	}

	$cmd = "touch $NFClogfile";
	system($cmd);

	print "NFClogfile: $NFClogfile\n";
	select(undef,undef,undef,1);

	if ($HTOOL) {
		&dprint("--> hcidump reading log $tmpNFClogfile \n");
		$cmd = "$HCILOG" . $port . " -Rt > $tmpNFClogfile";
		&dosystem($cmd);
		threads->create(\&BluzDumpLog, $_[0], $tmpNFClogfile)->detach();
	} else {
		&dprint("--> $handle nfclog $NFClogfile\n");
		print $handle "nfclog $NFClogfile\n";
	
		#$cmd = "$HCILOG" . $port . " -tR > $logfile &";
		#&dosystem($cmd);
	}
	select(undef,undef,undef,1);   # Give time for file to be created before moving on
}

######################################################

sub BluzDumpLog {

	my $tmpNFClogfile = $_[1];
	my $NFClogfile = $LOG . $TEST_NAME . "_NFC_" . $_[0] . ".log";
	my $file_handle;
	my $file_handle1;
	my $next_line;
	my $fileLine;

	select(undef, undef, undef, 0.1);	
	open (FH2, "<$tmpNFClogfile") || die "Unable to open $tmpNFClogfile : $!\n";
	my $line;
	
	for(;;) {
		open (FHNFC, ">>$NFClogfile") || die "Unable to open $NFClogfile : $!\n";
		while($line = <FH2>) {
			$fileLine = $line;
			$line =~ s/.+ < //;
			$line =~ s/.+ > //;
			@values = split(/ /, $line);
			if (($values[1] eq '81' && $values[2] eq 'FE') || ($values[1] eq 'FF' && $values[3] eq 'C0') || ($values[1] eq '0F' && $values[5] eq '81' && $values[6] eq 'FE') || $fileLine !~ '<' || $fileLine !~ '>' ) {
				print FHNFC $fileLine;
			}
		}
		close FHNFC;
		select(undef, undef, undef, 0.001);
		seek FH2, 0, 1;
	}
	close FH2;
}

#######################################################
#Functions added by Payal for NFC :
#######################################################
sub NFC_Parse_Event {
    
    my $hci_pkt = $_[0];
    my $praw = $_[0];
    my $event_id = undef;
    my $parsed_event = undef;
    my $hci_pkt_type = undef;
    my $event_size = undef;
    my $pevent = undef;
    
    $hci_pkt =~ s/\s//g;
    $hci_pkt_type = substr $hci_pkt, 0, 2, "";
    $event_id =  substr $hci_pkt, 0, 2, "";
    $event_size = substr $hci_pkt, 0, 2, "";
						
	$addr1 = &Extract_tag_Addr($hci_pkt); #Added this function for NFC by Nandita
 
    if ($hci_pkt_type eq '04') {
        if (exists $hci_event{$event_id}) {
#print "######## add:$hci_pkt########### \n\n";
            $parsed_event = &Add_Hash_Param_NFC(undef, $hci_pkt, $event_id, \%hci_event);
            $pevent = $parsed_event;
            $pevent =~ s/\-/\n\t/g;

	#my $praw1 = reverse ($praw=~ m/../g);
            if (($DPD) && ($pevent !~ m/Number_Of_Completed_Packets_Event/)) {
               &dprint (" < Received Event on $_[1]: $praw\n");
               &dprint (" < Received Event: $pevent\n");
            }
	
            return ("$parsed_event",$praw );
        }
        else {
            return ("Unknown Event: $_[0]");
        }
    }
    elsif ($_[1] eq '01') {
        &dprint ("\nCommand\n");
    }
    elsif ($_[1] eq '02') {
        #&dprint ("SCO data");
    }
    else {
        #&dprint ("*");
    }
 
}
########################################################################################
sub Add_Hash_Param_NFC {
    
    my $parsed_event =$_[0];
    my $hci_pkt = $_[1];
    my $key = $_[2];
    my $ref = $_[3];
    my $hash_key = undef;
    my $param = undef;
    my $param_value = undef;
    my $param_size = undef;
    my @com_op = ();
    my $cmd_str = undef;
  # my $hci_pkt_1 = undef;
 #  $hci_pkt_1 = $hci_pkt; 

    foreach my $i (0 .. $#{$ref->{$key}}) {        
        if (ref($ref->{$key}[$i]) eq "HASH" && $hash_key ne undef) {
       
 $parsed_event = &Add_Hash_Param_NFC($parsed_event, $hci_pkt, $hash_key, $ref->{$key}[$i]); 

        }
        else {
            if ($ref->{$key}[$i] =~ /\s* (\w+) \s* : \s* (\d+)  /x) {
                $param = $1;
                $param_size = $2 * 2;

                if ($param eq "Return_Parameters") {
                    foreach my $k (0 .. $#{$hci_cmd{$cmd_str}[1]}) {
                        $hci_cmd{$cmd_str}[1][$k] =~ /\s* (\w+) \s* : \s* (\d+)  /x;
                        $param = $1;
                        $param_size = $2 * 2;
                        $param_value = substr $hci_pkt, 0, $param_size, "";
                        $param_value = join("", reverse ($param_value =~ m/../g));
                        $parsed_event .= "-" . $param . ":" . $param_value;

                    }
                }
                else {
                   $param_value = substr $hci_pkt, 0, $param_size, "";
                   $param_value = join("", reverse ($param_value =~ m/../g));
                    if ($param eq "Command_Opcode") {
                        @cmd_op =&Opcode( hex $param_value); 

			$cmd_str = &Find_cmd_NFC(@cmd_op,$hci_pkt);
			#$cmd_str = $lastCmd;

                        $parsed_event .= "-" . $param . ":" . $lastCmd;
      
 }
                    else {
                        $parsed_event .= "-" . $param . ":" . $param_value;

                    }
                    $hash_key = $param_value;
                }
            }
            else {
                $parsed_event .= $ref->{$key}[$i];
;
            }
        }
    }

    return $parsed_event;
}
###########################################################
sub Find_cmd_NFC{
        my $result;
        my $k;
	my $nfc_cmd =0;
	my $hci_pkt = $_[10]; 
# Special check for FM commands as all commands are having same OCF	
	if ($_[0] eq "3F" && $_[1] eq "0281") {
		$nfc_cmd = $hci_pkt;
	}

        foreach $k (keys %hci_cmd){
                if (($_[0] eq  $hci_cmd{$k}[0][0]) && ($_[1] eq  $hci_cmd{$k}[0][1])){
			if ($nfc_cmd)
			{
				(@token_c) = split (/:/,$hci_cmd{$k}[0][2]); 	
				if ($nfc_cmd eq $token_c[2]) {
					$result= $k;
					last;
				}
				else {
					next;
				}
			}
			else {
                        	$result= $k;
	                        last; 
			}  
                }       
        }       
return $result;
}

##################################################################################################
sub Manage_log_NFC {
	my $ldev = $_[0];
    my $logfile = $_[1];
    my $logfile1 = $_[2];
    my $line;
    my $timestamp;
    my $parsed_event;
    my @l;

    $DPD = 0;
    ###Enter log header i.e. time, duration, name of script, etc

    open(fhandle, "<$logfile") or die "an error occured:$!";
    open(fhandle1, ">$logfile1") or die "an error occured:$!";
    while (<fhandle>){
        $line=$_;
        switch($line) {
        	case m/.* \s \( \d+ \)> \s .*/x {
        	    $line =~ m/(.*) \s \( \d+ \)> \s (.*)/x;
                $timestamp = $1;
                $parsed_event = &Parse_Event($2, $ldev);
                print fhandle1 "\n $timestamp >";
                (@l)=split(/-/, $parsed_event);
                foreach $value (@l) {
                    print fhandle1 "  $value\n";
                }
        	}
            case m/> 02/ {
        	    ####Data Packet####
            }
            case m/> 03/ {
         	   ###SCO packet#####
            }
            case m/< 01/ {
         	   	#####HCI Command####
               	(@l)= split (/ /, $line);
               	$timestamp= shift (@l);
               	print fhandle1 "\n $timestamp <";
               	$opcode = $l[3] . $l[2];
		$timestamp= shift (@l);  #payal changed
               	@cmd_op =&Opcode( hex $opcode);     
              	$cmd_str = &Find_cmd_NFC(@cmd_op,@l);
               	print fhandle1 " $cmd_str\n";
               	my $tlen = @{$hci_cmd{$cmd_str}[0]};
               	$j=5;

               	for (my $m=2; $m < $tlen; $m++) {
          	   		(@token_c) = split (/:/,$hci_cmd{$cmd_str}[0][$m]);     
	                 for ($k=0; $k < $token_c[1]; $k++) {
    	   	       	 	$param = $param . " " .$l[$j];
                   		$j++;       
                	 }
               		 $param = join ("",reverse split(" ",$param));

					print fhandle1 "  $token_c[0]:$param\n";
                    $param="";
                }
			} else {
				#####BTD string########
                if($line =~ m/received_acl_data/) {
					print fhandle1 "^";
				} else {
					print fhandle1 "\nBTD:$line";
				}
			}
		}
	} # While loop
    print fhandle1 "\n\n end of log: $logfile \n";
    print fhandle1 "$LOG_COMMENT\n";

	close fhandle;
	close fhandle1;

	if (!unlink($logfile)) {
		print "*FAILED*\nUnable to delete logfile $logfile.\n";
		# exit(1);
	}
	rename ($logfile1, $logfile);
}
###############################################################################
sub Set_LMP_Features { 			#<REF DEVICE> <FEATURE> <ENABLE/DISABLE>
	
	my $Feature = $_[1];
	my $Operation = $_[2] || 'ENABLE';
	my $ref_intf = $DEVICE{$_[0].'port'};
	my $Value;
	
	if ( $DEVICE{$_[0].manufacturer} eq "Broadcom Corporation." ) {
		switch ( $Feature ) {
			case m/^ESCO/i {
				if ( $Operation =~ m/DISABLE/i ) {
					$Value = "0xBF 0xFE 0xEF 0x7E 0xDB 0xFF 0x7B 0x87";
				} else {
					$Value = "0xBF 0xF6 0xCF 0xFE 0xDB 0xFF 0x7B 0x87";
				}
			}
			case m/^EDR/i {
				if ( $Operation =~ m/DISABLE/i ) {
					$Value = "0xBF 0xFE 0xCF 0xF8 0x5B 0xFE 0x7B 0x87";
				} else {
					$Value = "0xBF 0xFE 0xCF 0xFE 0xDB 0xFF 0x7B 0x87";
				}					
			}

			case m/^HV1/i {
				$Value = "0xBF 0xCE 0xCF 0x7E 0xDB 0xFF 0x7B 0x87";
			}
			case m/^HV2/i {
				$Value = "0xBF 0xDE 0xCF 0x7E 0xDB 0xFF 0x7B 0x87";
			} 					
			case m/^HV3/i {
				$Value = "0xBF 0xEE 0xCF 0x7E 0xDB 0xFF 0x7B 0x87";
			}
			case m/^EV3/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDB 0x1F 0x7B 0x87";
			}
			case m/^2-EV3/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDB 0x3F 0x7B 0x87";
			} 	
			case m/^3-EV3/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDB 0x7F 0x7B 0x87";
			} 	
			case m/^EV4/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xD9 0x9F 0x7B 0x87";
			} 	
			case m/^EV5/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDA 0x9F 0x7B 0x87";
			}
			case m/^2-EV5/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDA 0xBF 0x7B 0x87";
			}
			case m/^3-EV5/i {
				$Value = "0xBF 0xF6 0xCF 0xFE 0xDA 0xDF 0x7B 0x87";
			}
			case m/^All/i {
				$Value = "0xBF 0xFE 0xCF 0xFE 0xDB 0xFF 0x7B 0x87";
			}
		
			case m/^CMD/i {
				if ( $Operation =~ m/(.*) (.*) (.*) (.*) (.*) (.*) (.*) (.*)/i ) {
					$Value = "$1 $2 $3 $4 $5 $6 $7 $8";
				} else {
					&Monitor_Result('error', "There are less than 8 bytes in LMP features.");
				}
			}
		}
		if ($HTOOL) {
			&Send_System_CMD_Handler($_[0], "hcitool -i $ref_intf cmd 3F 0B $Value", 0);
		} else {
			&btd_CMD($_[0], "gcmd 3F 0B $Value");
		}
		
	} else {
		print "\n\nLMP FEATURES Cannot be modified. This API is support only IOgear dongles.....\n\n\n";
	}
}
########################################################################################################
sub WLAN_Unload_Load {

	my $output = "/root/output.txt";
	my $release_version = $DEVICE{dut."rel_version"};
	my $chip_value;
	my $wlan_driver_path;
	my @WLAN_driver_CMD;
	my @rel_info;
	my $default_release_path = $DEVICE{dut."local_path"};
	my $release_path ="$default_release_path"."$release_version";
	my $iteration = $_[0];
	my ($build_btchip_value,$build_chip_value);
	
	
	if($release_version =~ m/BT-(\d+)-/){ $chip_value =$1; }
	chdir($release_path);
	($build_btchip_value,$build_chip_value) = &load_val($release_path);
				
	@rel_info = split(/-/, $release_version);
	$WLAN_intfc = lc($rel_info[0]);
	system("chmod -R +x *");

    @WLAN_driver_CMD = ("./unload", "./load $WLAN_intfc$build_chip_value");
    $wlan_driver_path = "bin_".$WLAN_intfc.$build_chip_value;

	&Send_System_CMD(dut, "cp $release_path/$wlan_driver_path/*.ko $release_path/$wlan_driver_path/load $release_path/$wlan_driver_path/unload $release_path");

#### unload_load WLAN driver
   for(my $i =1; $i <= $iteration; $i++){ 
	    
         print "\n ======== WLAN Load/Unload Iteration#$i============== \n";
         foreach my $CMD (@WLAN_driver_CMD){ 
                   print "\n $CMD";
                   system("$CMD");
                   select (undef, undef, undef, 1);
             }
          system("iwpriv mlan0 version > $output");
	      open (FILE1, $output) or die ("\nSystem Failed to open file \n");
          my @mlan_output = <FILE1>;
          close FILE1;
          sleep 2; 
          print"=========mlan output is $mlan_output[0]\n"; 
          
	      if(@mlan_output){
			   	foreach my $line (@mlan_output){
					
				    	  if($line !~ /version/i){ 
							     &monitor_result('error', "\n WLAN Driver loading failed..at iteration #$i\n");}
					       else{print "\n $line =========WLAN Driver load is successful==========\n";}
					    }
       	   } else{
			      print "\n######@mlan_output#####\n";&monitor_result('error', "\n WLAN Driver loading failed..at iteration #$i\n");}    
        }
 }
#######################################################################
sub BT_Scan{

	my $output = "/root/output1.txt";
	my @BT_Scan_OP;
	my $hci_intf = $DEVICE{dut."port"};
	my $device_count=0;
	my $i;
	my $iteration = $_[0];;

	for ($i =1; $i <=$iteration; $i++){
           $device_count=0;
           print "\n ======== BT Scan Iteration#$i============== \n";  
           &Send_System_CMD_Handler(dut,"hcitool -i$hci_intf scan --flush > $output", 0, 1); 
           open (FILE, $output) or die ("\nSystem Failed to open file BRF_CFG0_Table.txt \n");
           @BT_Scan_OP = <FILE>;
           close FILE;
       
           foreach my $bd_add (@BT_Scan_OP){
                  chomp $bd_add; 
                        
                  if($bd_add =~ m/((([0-9a-f]{2}?[:]){5}?)[0-9a-f]{2}?)/i){
                             $device_count++;
                             print "\n$bd_add and device found are $device_count";
                        }
              }   
    if($device_count==0){ 
		 &monitor_result('error', "\n No Device found during BT Scan..at iteration #$i \n");}         
       }
 }
#########################################################################
sub BT_Load_Unload{

	my $hci_intf = $DEVICE{dut."port"};
	my $output = "/root/out_put.txt";
	my $default_release_path = $DEVICE{dut."local_path"};
	my $release_version = $DEVICE{dut."rel_version"};
	my $release_path ="$default_release_path"."$release_version";
	my $bt_driver_path;
	my @rel_info;
	my($build_chip_value, $build_wlanchip_value,$app_uart_folder,$bin_uart_folder); 
	my $iteration = $_[0];

	@rel_info = split(/-/, $release_version);

### Determine BT Interface###################
	if ($rel_info[2] eq "BT"){ 
		 $BT_intfc = $rel_info[0];}
	else{
		 $BT_intfc = $rel_info[2];} 
	#############################################

	($build_chip_value,$build_wlanchip_value) = &load_val($release_path, $build_bt_intf);
     
	 if($BT_intfc =~ /SD/i){

		     @BT_Driver_CMD = ("hciconfig $hci_intf down", "rmmod bt8xxx", "insmod bt$build_chip_value.ko"); 
		     $bt_driver_path = "bin_sd$build_chip_value"."_bt";      
			 }	 
	 elsif($BT_intfc =~ /UART/i){
		
			 my $uart_port;
			 system("ls /dev/ttyUSB* > $output"); ### determine UART interface
			 open (FILE, "$output") or &monitor_result('error',"\nSystem Failed to open file \n");
			 while (<FILE>){ 
					chomp;
					$_ =~ /USB(\d+)/;
					$uart_port = $1;  
				 } 
			 close FILE;

			($build_btchip_value,$app_uart_folder,$bin_uart_folder) = &load_val($release_path, $build_bt_intf);
			 $bt_driver_path = "$app_uart_folder/mfguart";
  			 system("chmod +x *");  
			 @BT_Driver_CMD = ("killall hciattach", "hciconfig $hci_intf down", "rmmod hci_uart", "insmod hci_uart.ko", "hciattach /dev/ttyUSB$uart_port any -s 3000000 3000000 flow dtron");    }
			 
	 elsif($BT_intfc =~ /USB/i){
	 
            if($WLAN_intfc =~ /PCIE/i){
				@BT_Driver_CMD = ("hciconfig -a $hci_intf down", "rmmod bt$build_chip_value","insmod bt$build_chip_value.ko", "hciconfig -a $hci_intf up");}
            else{
				  my $uname_op= system("uname -a | grep fc18");
                  if($uname_op){ 
                                 @BT_Driver_CMD = ("hciconfig -a hci0 down","rmmod btusb", "insmod /lib/modules/btusb.ko"); }
                  else{
                                 @BT_Driver_CMD = ("hciconfig -a hci0 down", "rmmod btusb", "insmod /lib/modules/3.10.11-100.fc18.x86_64/kernel/drivers/bluetooth/btusb.ko");
						}   
				} 
			$bt_driver_path = "bin_usb$build_chip_value"."_bt";            
	}

	&Send_System_CMD(dut, "cp $release_path/$bt_driver_path/*.ko $release_path");
	chdir($release_path);

	for(my $i =1; $i <=$iteration; $i++){
	 
			 print "\n ======== BT Load/unload Iteration#$i============== \n"; 
			 foreach my $CMD (@BT_Driver_CMD){ 
				sleep 1;
				print "\n$CMD\n"; 
				system("$CMD");
				sleep 1;
			}
				   
      system("hciconfig hci0 > $output");
      open (FILE, $output) or die ("\nSystem Failed to open file\n");
      my (@BT_Device)= <FILE>;
      close FILE;
			  my $j=0;
			  foreach my $line (@BT_Device){
										 
						 if(($line !~ m/UP/i)&&($j >= $#BT_Device)){
								  &monitor_result('error', "\n ###BT Load/Unload was Failed..at iteration #$i\n");}
						 elsif($line =~ m/UP/i){
								  &Send_System_CMD(dut, "hciconfig"); 
								   print "\n======Loading BT driver Successful=========\n"; 
								   last;
								} 
						  $j++;      
						}
			  }			
	  }
##############################################################################
sub WLAN_Scan {

	my $output = "/root/output2.txt";
	my @WLAN_Scan_OP;
	my $device_count=0;
	my $iteration = $_[0];
	my $i;

	for ($i =1; $i <=$iteration; $i++){

		  print "\n ========WLAN Scan Iteration#$i============== \n";  
		  &Send_System_CMD_Handler(dut,"iwlist mlan0 scan > $output", 0 ,1); 
		  open (FILE, $output) or die ("\nSystem Failed to open file \n");
		  @WLAN_Scan_OP = <FILE>;
		  close FILE;
		   
		   foreach my $device (@WLAN_Scan_OP){
			   
				  chomp $device;       
				   if($device =~ m/ESSID/i){
							$device_count++;
							print "\n$device and device found are $device_count";
					   }
				} 
     if($device_count==0){  &monitor_result('error', "\n WLAN Scan Failed..at iteration $i\n\n");}  
         }
  }
##################################################################################
sub load_val {
	
my $P_FILE  = "/root/BATS/build.tmp";	
my $build_path = $_[0];	
my @_folder_contents;
my $build_btchip_value;
my $build_wlanchip_value;
my $app_uart_folder;
my $bin_uart_folder;

    system("ls $build_path > /root/BATS/folder_details.txt"); 
    open (FH2, "/root/BATS/folder_details.txt");
    @_folder_contents = <FH2>;
    
    foreach my $line (@_folder_contents){
			
			if ($line =~ m/(bin_)(sd|pcie|usb)([0-9a-z]{4})\n/i) {
				    chomp $line;
				    $build_wlanchip_value = $3;
				   
			}else {
				    if($_[1] !~ /uart/i){
				          if ($line =~ m/(bin_)(sd|pcie|usb)([0-9a-z]{4})(_bt)/i) {
				                 chomp $line;
				                 $build_btchip_value = $3;
				              }
				    } elsif($_[1] =~ /uart/i){                #### If BT interface is uart it will return folder names and chip id
						
						       if($line =~ /(app_)(uart)(\d+)\w?/) {
								   chomp $line;
								   $app_uart_folder = $line;
								   $build_btchip_value = $3;
								   
								    }      
							   if($line =~ /(bin_bturt|bin_muart)/){
								   chomp $line; 
								   $bin_uart_folder = $line;
								}     		 		        
			             }
				}	
			
	close FH2;		
	}	

    if($_[1] =~ /uart/i){		
	   
             return $build_btchip_value,$app_uart_folder,$bin_uart_folder;
     } else {

             return $build_btchip_value,$build_wlanchip_value;
    }
}
#################################################################################
sub Current_Measure{
	
	my $DMMcurrent	= $_[0];
	my $DMMavg		= 0;
	my $WaitTime	= 1;
	my $Samples		= 3;
	my $DevSock;
	my $CURRString;
		
	if ( $DMMcurrent =~ m/CURR-(.*)/ ) {
		require('BT_Performance/CurrCPU/MrvlDMM.lib');

		my $DevIP = $1;
		my $Return;

		$Return = &CheckDMM($DevIP);
		if (!$Return) { 
			$DevSock = &DMMInit($DevIP);
			sleep 1;
			&DMMreset($DevSock);
			sleep 1;
			&DMMconfig($DevSock);
			sleep 1;
		} else {
			#&monitor_result('error',"DMM Not in the network. Please connect DMM to host network");		
		}

		$DMMavg = &DMMmeasureAVG_DCcurr($DevSock, $WaitTime, $Samples) * 1000;
		$DMMavg = sprintf "%.3f", $DMMavg;
		$CURRString = "Avg. Current Consumption = $DMMavg mA";
			
	}
	return $CURRString;
}
