# !/usr/bin/env perl
#
#Purpose : This script will copy latest build from server into local machine. Once build is copied sanity test will be triggered and 
#          result will be send to email id configured in sanity.conf file
#
#Author : Mahesh Nahar        
################################################################################
use Cwd;
require ('DailySanity/batslib.pl');
require ('DailySanity/hci_def.pl');
require ('DailySanity/BT_WLAN_load.pl');
require ('libs/Master_TestLib.pl');
@DEVICE = (UUT);
our $localDir = cwd();
our $TEST = "build_load";
my $input_xls = $ARGV[1] || "Sanity.xls";
my $output_xls = $ARGV[2] || "output_Sanity.xls";
$ENV{'_Auto_Load'} =1;
$ENV{'_Email'} = "njames@marvell.com";

#################################################
## This section will check if already run is going on for sanity then it will exit else trigger build load etc
###
#######################################################################

system("ps -ax | grep perl > exec.txt");
open(FH0, "exec.txt");
my @exec_details = <FH0>;
my $count =0;

foreach my $line (@exec_details){
print "$line\n";
if ($line =~ /PLATFORM_REG.pl/i){
         $count++;
       }
     if ($count > 2){
            print "\n Already run is going on..\n";
            exit;
       }
}

system("perl DailySanity/Sanity_Conf.pl $input_xls Conf_Parse.xls");    #### This script will parse set-up tab from iput excel file
sleep 2;

&Load_Sanity_Conf_File();

########################################################
#Test section
	my $server_path = $DEVICE{FW_LOC.'fw_loc'};
	#$server_path = "//swrel/swrel/ENG_Internal_Release/EEBU_SW_REL/W8787/LINUX/sd/SD-8787/DAILY";
	my $HW = $DEVICE{BUILD_SERVER.'hw'};
	my $chip_id = substr $HW, 1, 4;
	my $wlan_intf = uc $DEVICE{BUILD_SERVER.'wlan_intf'};
	my $bt_intf = uc $DEVICE{BUILD_SERVER.'bt_intf'};
	my $usr_name = $DEVICE{BUILD_SERVER.'username'};
	my $passwd = $DEVICE{BUILD_SERVER.'password'};
	my @builds;
	my $build_test_count = 0;
	my @build_test_name;
	my @build_string_check;
	my $build_wlan_intf;
	my $build_bt_intf;
	my $build_chip_value;
	my $build_path;
	my $mount_path;
	my $local_build_path;
	my $P_FILE  = "$localDir/build.tmp";
	our $_build_test_name;

	#### This section verify interface entered by user in set-up tab are correct 

	if(($wlan_intf ne "USB") && ($wlan_intf ne "PCIE") && ($wlan_intf ne "SD")){

		       &monitor_result('Incorrect_BT-WLAN_Interface');
		       
	 }elsif(($bt_intf ne "USB") && ($bt_intf ne "UART")&& ($bt_intf ne "SD")){

		       &monitor_result('Incorrect_BT-WLAN_Interface');
	}

#####################################################################################
	print "\$server_path  is $server_path ,$DEVICE{Email.'email'},\n\$chip_id is $chip_id, \$wlan_intf is $wlan_intf, \$bt_intf is $bt_intf, \$usr_name is $usr_name and \$passwd is $passwd \n";

	$mount_path = "/mnt/$chip_id";
	$local_build_path = "$localDir/Builds";

	if(! -d $mount_path){                           ## Make folder for mounted drive
		 system("mkdir /mnt/$chip_id");
		 system("chmod +x *");
		 }

	if(! -d $local_build_path){                         ## Make Folder in local machine to copy the builds from server
		      system("mkdir $local_build_path");}

	system ("umount -a -t cifs -l");

	my $mnt_output = system("mount -t cifs $server_path -o username=$usr_name,password=$passwd $mount_path");

	if($mnt_output){
			 print "\n  ==Opps ...Error while mounting Build_Server....!!!!\n";
		     &monitor_result('mount_failed');}

###################################################################################################
### Below section check whether build is from Daily build or sanity build

	if($server_path =~ /DAILY/){        
           		 system("ls -t $mount_path  > /root/tmp.txt");} 
    elsif ($server_path !~ /DAILY/) {  ### this check is to determine whether host id fc13 or fc18 
                 my $uname_op= system("uname -a | grep fc18");

                 if($uname_op){ 
                               system("ls -t $mount_path | grep FC13 > /root/tmp.txt"); }
                 else{
                               system("ls -t $mount_path | grep FC18 > /root/tmp.txt"); }
      }                 
####################################################################################################
	open (FH, "/root/tmp.txt");
	@builds = <FH>;
	chdir $local_build_path;
	system("pwd");
	

	######## Below section to check latest build from Server for required interface of WLAN and BT then copy latest build into local machine 
	#load into board and start execution

	for(my $i=0; $i<=$#builds; $i++ ){
		system("killall -9 wpa_supplicant");
		system("killall -09 NetworkManager");
		
		chomp $builds[$i];	   
		if($server_path !~ /DAILY/) { 
		    
		    # Take care this case later
                
		} elsif ($server_path =~ /DAILY/) {
		 
			my $build_to_test;
			my $build_found = 0;
		 
			if (defined $ARGV[2]) {
				if (-d $ARGV[2]) {
					$build_to_test = $ARGV[2];
					$build_found = 1;
				} else {
					print "\n Build $ARGV[2] does not exist in local build directory\n"; 
					system ("umount -a -t cifs -l");
					exit 3;				
				}
				 
			} else {
				if(! -d $builds[$i]){
					$build_to_test = $builds[$i];
                    mkdir $build_to_test; 
                    open (FH1, " > $P_FILE" ) or  print "\nSystem Failed to open file \n";  ## this part is for send build srting in email
                    print FH1 "$build_to_test";
                    close FH1;
					#Copy build to local host
					&Build_Copy($build_to_test);
					$build_found = 1;

                } else { 
					
                    print "\n Build already present\n"; 
                    system ("umount -a -t cifs -l");
                    exit 2;
                }
            }
            
            print "\nbuild to test is $build_to_test\n";
			#Copy build to remote host
			chdir ("$localDir");
			&Initialize($TEST, "DAILY_SANITY");
			&FC18_UpdateImage(UUT, "Builds/$build_to_test");
			
			if($server_path =~ m/PCIE/i) { 
				&Send_System_CMD_Handler('UUT',"reboot",1);
				sleep 90;	
			}
			sleep 5;			           
            exit 0; 
		}

	}
 
######################################################################


######################################################################
sub Build_String_Parse {
	
     @build_string_check = split /-/, $_[0];
     $build_wlan_intf = uc $build_string_check[0];

     if($builds =~ m/-(\d+)-/){ 
                 $build_chip_value =$1; }

     		if($build_string_check[2] =~ m/BT/i){
     	               $build_bt_intf = $build_wlan_intf;} 
            else{
     	               $build_bt_intf = uc $build_string_check[2]; }  
     	               
     foreach my $string (@build_string_check){
         
           if($string =~ /\d{2}\.\d{2,3}\.\d{1,3}\.p\d+/){  }
       } 
       
     return ($build_bt_intf,$build_wlan_intf);
}
##########################################################################
sub Build_Copy{

     my $bin_copy;
     my $fw_copy;
     my $fw_uart_copy;
     my $fw_branch;

     print"\nWait Build is being copied into local machine .....\n";
     $bin_copy = system("cp -R -f $mount_path/$_[0]/bin* $local_build_path/$_[0]");
     $fw_copy  = system("cp -R -f $mount_path/$_[0]/FwImage $local_build_path/$_[0]");
     $fw_branch= system("cp -R -f $mount_path/$_[0]/release_fw_branch.txt $local_build_path/$_[0]");

     if($bt_intf =~ /UART/i){    ## For UART build need to copy one more folder

                       $fw_uart_copy  =system("cp -R -f $mount_path/$_[0]/app* $local_build_path/$_[0]");
               if(($bin_copy) || ($fw_copy) ||  ($fw_branch) || ($fw_uart_copy)){
                        &monitor_result('Build_Copy_Failed'); }
     }elsif(($bin_copy) || ($fw_copy) || ($fw_branch)){
                        &monitor_result('Build_Copy_Failed'); }

     print "\n =====Build copied successfully into local machine...======\n";

 }
#######################################################################################################################################
sub Firmware_Copy{

   my $FW_output;
   $build_path = "/root/$chip_id/$_[0]";
   chdir("$build_path");
  
   system("rm /lib/firmware/mrvl/*"); 
   $FW_output =  system("cp -n FwImage/* /lib/firmware/mrvl/"); 

   if ($FW_output){
           &monitor_result('FW_Copy_Failed');} 
   else{  
           print "\n =====Firmware copied successfully======\n";}
}
#############################################################################
sub cmd_arg
{
    my $num_args=$#ARGV + 1;
    if ($num_args != 2) {
        print "\n Missing Arguements\n";
        print "\n example usage : perl build_load.pl <input_xls><output_xls>\n ";
        exit 1;       
    }  
}
