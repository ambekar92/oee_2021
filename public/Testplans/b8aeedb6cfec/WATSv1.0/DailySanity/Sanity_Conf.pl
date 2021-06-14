#	© 2019 NXP Confidential. All rights reserved
# Purpose: Wrapper Program to extract set-up tab 
#
# Author:  Mahesh Nahar
###########################################################
#!/usr/bin/perl -w
#use strict;
use Spreadsheet::ParseExcel;
use Spreadsheet::ParseExcel::SaveParser;
use Spreadsheet::WriteExcel;
use Cwd ;
use File::Copy ;
use File::Copy::Recursive qw(fcopy rcopy dircopy fmove rmove dirmove) ;
use File::Path ;
use Time::HiRes qw(gettimeofday tv_interval);
###########################################################
# Global Variables
our $ConfFile	   = "sanity.conf";
our $ConfFileBackup= "sanity_backup.conf";
# Local Variables
my $inputFile     = undef;
my $outFile       = undef;
my $workbook      = undef;
my @sheet_names   = ();
my $workbook1     = undef;
my $LINUX = 1;

###########################################################
#Test section
system("clear");
&Parse_Arguments();
&Parse_Excel();

###########################################################
# Parse ARGV
sub Parse_Arguments {
my $numArgs = $#ARGV + 1;

   if ($numArgs == 2)
   {
      $inputFile =  $ARGV[0];
      $outFile = $ARGV[1];
      	  
      $inputFile .= '.xls' unless( $inputFile =~ m/\.xls$/ ) ;
      $outFile .= '.xls' unless( $outFile =~ m/\.xls$/ ) ;
      
      if (!(-e $inputFile))
      {
         print "Your Input File: $inputFile does not exist.\n";
         exit(1);
      }
    # We will need to change this as we can still use existing file to retest Failures
    # DPD
      if( -e $outFile )
      {
         if (!unlink($outFile)) {
            print "*FAILED*\nUnable to Clobber $outFile.\n";
            exit(1);
         }
      }
    print ("\n$outFile does not exist - making copy of $inputFile\n");
    if ($LINUX) {
    system( "cp $inputFile $outFile" ); # or die "system copy failed: $?";;
    } else {
      system( "copy $inputFile $outFile" ); # or die "system copy failed: $?";;
    }

   }
  }
###########################################################
# ParsingExcel Setup Tab
sub Parse_Excel
{
    my $row_start = 3; #assuming the row number starts from 0
    my $col_start = 1; #assuming the col number starts from 0
    
    #Open Excel file for parsing 
    print "\n\nOpening Excel file to parse set-up tab : \"$outFile\"\n";
    my $parser   = new Spreadsheet::ParseExcel::SaveParser;
    $workbook = $parser->Parse($outFile);

    # Set the worksheet to "Setup" for getting the config info.
    my $worksheet = $workbook->worksheet('Setup'); 

    my ( $row_min, $row_max ) = $worksheet->row_range();
    my ( $col_min, $col_max ) = $worksheet->col_range();

    # Get the value of all the parameters
    for (my $row=$row_start; $row<=$row_max; $row++)
    {
        my $cell_name = $worksheet->get_cell( $row, $col_start );
        next unless $cell_name;
        my $param_name = $cell_name->value();
        $cell_val = $worksheet->get_cell( $row, $col_start+1 );
        $param_val{uc($param_name)} = $cell_val->value();       
    }
    
    &Create_Configuration_File($worksheet);
    return( 0 ) ;
}       
###########################################################
# Create Configuration(auto.conf) file for device specific information.
# If File already present creates a backup of the existing file(auto_backup.conf).

sub Create_Configuration_File {

	my $WorkSheetSetup = $_[0];
    my $row_start = 2; #assuming the row number starts from 0
    my $col_start = 1; #assuming the col number starts from 0
    my $param_name;
    my $param_val;
    my ( $row_min, $row_max ) = $WorkSheetSetup->row_range();

	if ( -e $ConfFile ) {
		if ( -e $ConfFileBackup ) {
			system("rm -rf $ConfFileBackup");
		}
		system("mv $ConfFile $ConfFileBackup");
	}
	
	open(FH, ">$ConfFile") || die "Unaable to open $ConfFile: $!";
	my $Date = localtime(time());
	print FH "####################################################\n";
	print FH "# Auto Genrated Configuration File based on the entries in excel file\n";
	print FH "# Excel File: $inputFile\n";
	print FH "# Dated: $Date\n";
	print FH "####################################################\n";
	print FH "[SANITY_CONF_LOG_START]\n\n";
    
    # Get the value of all the parameters
	for (my $RowIter=$row_start; $RowIter<=$row_max; $RowIter++) {
		$param_name = "";
		$param_val = "";
        my $cell_name = $WorkSheetSetup->get_cell( $RowIter, $col_start );
        next unless $cell_name;
        $param_name = $cell_name->value();
        
        if ($param_name =~ m/^DEV_DUT/ ) {
			$param_name =~ s/^DEV_DUT_//;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
        if ($param_name =~ m/^DEV_REF/ ) {
			$param_name =~ s/^DEV_//;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
        if ($param_name =~ m/^AP1_NAME/ ) {
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
        if ($param_name =~ m/^DEV_BT/ ) {
			$param_name =~ s/^DEV_BT_//;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
		
		 if ($param_name =~ m/^DEV_AP/ ) {
			$param_name =~ s/^DEV_AP_/AP_/;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
		
		 if ($param_name =~ m/^DEV_HOST/ ) {
			$param_name =~ s/^DEV_HOST_/HOST_/;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
		
		if ($param_name =~ m/^DEV_BUILD/ ) {
			$param_name =~ s/^DEV_BUILD_/BUILD_/;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
		
		if ($param_name =~ m/^DEV_Email/i ) {
			$param_name =~ s/^DEV_Email/Email/;
			print FH "$param_name=";
			my $cell_val = $WorkSheetSetup->get_cell( $RowIter, $col_start+1 );
			$param_val = $cell_val->value();
			print FH "$param_val\n";
		}
    }

	print FH "\n[SANITY_CONF_LOG_END]\n";
	close FH;
}



